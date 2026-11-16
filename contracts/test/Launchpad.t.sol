// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Launchpad} from "../src/Launchpad.sol";
import {LaunchToken} from "../src/LaunchToken.sol";
import {Pool} from "../src/Pool.sol";

contract LaunchpadTest is Test {
    Launchpad lp;
    address treasury = makeAddr("treasury");
    address creator = makeAddr("creator");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address ref = makeAddr("ref");

    uint256 constant FEE = 0.0001 ether;
    uint256 constant DEPOSIT = 0.002 ether;
    uint256 constant V0 = 0.1 ether;
    uint256 constant WINDOW = 5;

    function setUp() public {
        lp = new Launchpad(treasury, FEE, DEPOSIT, V0, WINDOW);
        vm.deal(creator, 100 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    function _launch(string memory sym, uint256 initialBuy) internal returns (address t) {
        address[] memory team = new address[](0);
        vm.prank(creator);
        t = lp.launch{value: FEE + DEPOSIT + initialBuy}("Test Coin", sym, "ipfs://x", team, 0, address(0));
    }

    function _solvent() internal view {
        // contract balance must cover every native it owes
        uint256 owed = lp.protocolFees() + lp.pendingDeposits();
        uint256 n = lp.coinCount();
        for (uint256 i; i < n; ++i) {
            (,,,,,,,,, uint256 realNative,,,) = lp.coins(lp.allCoins(i));
            owed += realNative;
        }
        address[5] memory who = [creator, alice, bob, ref, treasury];
        for (uint256 i; i < who.length; ++i) owed += lp.claimable(who[i]);
        assertGe(address(lp).balance, owed, "insolvent");
    }

    // ------------------------------------------------------------ launch

    function test_LaunchMintsSupplyToLaunchpad() public {
        address t = _launch("TEST", 0);
        assertEq(LaunchToken(t).balanceOf(address(lp)), 1_000_000_000e18);
        assertEq(LaunchToken(t).name(), "Test Coin");
        assertEq(lp.protocolFees(), FEE);
        assertEq(lp.pendingDeposits(), DEPOSIT);
        assertEq(lp.coinCount(), 1);
    }

    function test_LaunchWithInitialBuyPaysOnlyBaseFee() public {
        address t = _launch("TEST", 0.01 ether);
        uint256 bal = LaunchToken(t).balanceOf(creator);
        assertGt(bal, 0);
        // 1% fee, not the 99% sniper fee
        (,,,,,,,,, uint256 realNative,,,) = lp.coins(t);
        assertEq(realNative, 0.0099 ether);
    }

    function test_RevertWhen_BadInputs() public {
        address[] memory team = new address[](0);
        vm.startPrank(creator);
        vm.expectRevert(Launchpad.BadName.selector);
        lp.launch{value: 1 ether}("", "X", "", team, 0, address(0));
        vm.expectRevert(Launchpad.BadSymbol.selector);
        lp.launch{value: 1 ether}("X", "ELEVENCHARS", "", team, 0, address(0));
        vm.expectRevert(Launchpad.InsufficientPayment.selector);
        lp.launch{value: FEE}("X", "X", "", team, 0, address(0));
        vm.stopPrank();
    }

    // ------------------------------------------------------------ sniper fee

    function test_SniperFeeDecays() public {
        address t = _launch("SNIPE", 0);
        assertEq(lp.currentBuyFeeBps(t, alice), 9_900);
        assertEq(lp.currentBuyFeeBps(t, creator), 100);
        vm.warp(block.timestamp + 2);
        assertEq(lp.currentBuyFeeBps(t, alice), 9_900 - (9_800 * 2) / 5);
        vm.warp(block.timestamp + 3);
        assertEq(lp.currentBuyFeeBps(t, alice), 100);
    }

    function test_SniperPaysMostToFees() public {
        address t = _launch("SNIPE", 0);
        vm.prank(alice);
        lp.buy{value: 1 ether}(t, 0, alice, address(0));
        // 99% fee; half to creator
        assertEq(lp.claimable(creator), 0.495 ether);
    }

    function test_TeamWalletsExempt() public {
        address[] memory team = new address[](1);
        team[0] = bob;
        vm.prank(creator);
        address t = lp.launch{value: FEE + DEPOSIT}("Team", "TEAM", "", team, 0, address(0));
        assertEq(lp.currentBuyFeeBps(t, bob), 100);
        assertEq(lp.currentBuyFeeBps(t, alice), 9_900);
    }

    // ------------------------------------------------------------ trading

    function test_BuySellRoundTripLosesOnlyFees() public {
        address t = _launch("RT", 0);
        vm.warp(block.timestamp + WINDOW);
        uint256 before = alice.balance;
        vm.prank(alice);
        uint256 got = lp.buy{value: 0.05 ether}(t, 0, alice, address(0));
        vm.prank(alice);
        lp.sell(t, got, 0, alice, address(0));
        uint256 lost = before - alice.balance;
        // ~2% in fees plus rounding dust
        assertApproxEqRel(lost, 0.05 ether * 2 / 100, 0.02e18);
        _solvent();
    }

    function test_SellNeedsNoApproval() public {
        address t = _launch("NOAPP", 0);
        vm.warp(block.timestamp + WINDOW);
        vm.prank(alice);
        uint256 got = lp.buy{value: 0.01 ether}(t, 0, alice, address(0));
        assertEq(LaunchToken(t).allowance(alice, address(lp)), 0);
        vm.prank(alice);
        lp.sell(t, got, 0, alice, address(0));
        assertEq(LaunchToken(t).balanceOf(alice), 0);
    }

    function test_CannotPullSomeoneElsesTokens() public {
        address t = _launch("SAFE", 0);
        vm.warp(block.timestamp + WINDOW);
        vm.prank(alice);
        lp.buy{value: 0.01 ether}(t, 0, alice, address(0));
        // bob has no tokens; selling reverts even though alice holds some
        vm.prank(bob);
        vm.expectRevert();
        lp.sell(t, 1e18, 0, bob, address(0));
    }

    function test_SlippageReverts() public {
        address t = _launch("SLIP", 0);
        vm.warp(block.timestamp + WINDOW);
        (uint256 q,,,) = lp.quoteBuy(t, 0.01 ether, alice);
        vm.prank(alice);
        vm.expectRevert(Launchpad.Slippage.selector);
        lp.buy{value: 0.01 ether}(t, q + 1, alice, address(0));
    }

    function test_QuoteMatchesBuy() public {
        address t = _launch("QUOTE", 0);
        vm.warp(block.timestamp + WINDOW);
        (uint256 q,,,) = lp.quoteBuy(t, 0.03 ether, alice);
        vm.prank(alice);
        uint256 got = lp.buy{value: 0.03 ether}(t, q, alice, address(0));
        assertEq(got, q);
    }

    function test_ReferralEarns() public {
        address t = _launch("REF", 0);
        vm.warp(block.timestamp + WINDOW);
        vm.prank(alice);
        lp.buy{value: 0.1 ether}(t, 0, alice, ref);
        // fee 0.001; creator 50% => rest 0.005; referral 10% of that
        assertEq(lp.claimable(ref), 0.00005 ether);
    }

    // ------------------------------------------------------------ copies

    function test_CopyPaysOriginal() public {
        address orig = _launch("DOGE", 0);
        vm.prank(bob);
        address[] memory team = new address[](0);
        address copy = lp.launch{value: FEE + DEPOSIT}("Doge Copy", "doge", "", team, 0, address(0));
        (,,,,, address originalOf,,,,,,,) = lp.coins(copy);
        assertEq(originalOf, orig);

        vm.warp(block.timestamp + WINDOW);
        vm.prank(alice);
        lp.buy{value: 0.1 ether}(copy, 0, alice, address(0));
        // fee 0.001, creator share 0.0005, half to the original creator
        assertEq(lp.claimable(creator), 0.00025 ether);
        assertEq(lp.claimable(bob), 0.00025 ether);
    }

    function test_CopyOfDeadCoinPaysNothing() public {
        _launch("DEAD", 0);
        vm.warp(block.timestamp + 8 days);
        vm.prank(bob);
        address[] memory team = new address[](0);
        address copy = lp.launch{value: FEE + DEPOSIT}("Dead2", "DEAD", "", team, 0, address(0));
        vm.warp(block.timestamp + WINDOW);
        vm.prank(alice);
        lp.buy{value: 0.1 ether}(copy, 0, alice, address(0));
        assertEq(lp.claimable(creator), 0);
        assertEq(lp.claimable(bob), 0.0005 ether);
    }

    // ------------------------------------------------------------ graduation

    function test_GraduatesInSameTxWithRefund() public {
        address t = _launch("GRAD", 0);
        vm.warp(block.timestamp + WINDOW);
        uint256 need = lp.nativeToGraduate(t);
        assertApproxEqRel(need, 0.2858 ether, 0.01e18); // ~0.283 net + 1% fee at V0 = 0.1

        uint256 before = alice.balance;
        vm.prank(alice);
        lp.buy{value: 5 ether}(t, 0, alice, address(0));
        assertApproxEqAbs(before - alice.balance, need, 2); // overpayment refunded

        Launchpad.CoinView memory v = lp.getCoin(t);
        assertTrue(v.pool != address(0));
        assertEq(v.progressBps, 10_000);
        assertEq(LaunchToken(t).balanceOf(address(lp)), 0);
        assertGt(LaunchToken(t).balanceOf(lp.DEAD()), 0); // unused reserve burned
        // deposit refunded to creator
        assertGe(lp.claimable(creator), DEPOSIT);
        _solvent();
    }

    function test_PoolOpensAtCurvePrice() public {
        address t = _launch("PRICE", 0);
        vm.warp(block.timestamp + WINDOW);
        uint256 need = lp.nativeToGraduate(t);
        vm.prank(alice);
        lp.buy{value: need}(t, 0, alice, address(0));
        (,,,,,,, uint256 vN, uint256 vT,,,,) = lp.coins(t);
        uint256 curvePrice = (vN * 1e18) / vT;
        Pool p = Pool(lp.getCoin(t).pool);
        assertApproxEqRel(p.price(), curvePrice, 0.0001e18);
    }

    function test_PoolTradingAndFees() public {
        address t = _launch("POOL", 0);
        vm.warp(block.timestamp + WINDOW);
        vm.prank(alice);
        lp.buy{value: 1 ether}(t, 0, alice, address(0));
        Pool p = Pool(lp.getCoin(t).pool);

        uint256 creatorBefore = lp.claimable(creator);
        vm.prank(bob);
        uint256 got = p.buy{value: 0.1 ether}(0, bob, address(0));
        assertGt(got, 0);
        // 1% fee, 60% to creator after graduation
        assertEq(lp.claimable(creator) - creatorBefore, 0.0006 ether);

        // curve is closed
        vm.prank(bob);
        vm.expectRevert(Launchpad.AlreadyGraduated.selector);
        lp.buy{value: 0.1 ether}(t, 0, bob, address(0));

        // sell back on the pool without approval
        vm.prank(bob);
        uint256 out = p.sell(got, 0, bob, address(0));
        assertGt(out, 0);

        // mature share after 7 days
        vm.warp(block.timestamp + 7 days);
        creatorBefore = lp.claimable(creator);
        vm.prank(bob);
        p.buy{value: 0.1 ether}(0, bob, address(0));
        assertEq(lp.claimable(creator) - creatorBefore, 0.00075 ether);
        _solvent();
    }

    function test_OnlyPoolCanCreditFees() public {
        address t = _launch("FAKE", 0);
        vm.expectRevert(Launchpad.NotPool.selector);
        lp.creditPoolFee{value: 1}(t, alice, address(0));
    }

    function test_ClaimPaysOut() public {
        address t = _launch("CLAIM", 0);
        vm.warp(block.timestamp + WINDOW);
        vm.prank(alice);
        lp.buy{value: 1 ether}(t, 0, alice, address(0));
        uint256 owed = lp.claimable(creator);
        uint256 before = creator.balance;
        vm.prank(creator);
        lp.claim();
        assertEq(creator.balance - before, owed);
        assertEq(lp.claimable(creator), 0);

        uint256 pf = lp.protocolFees();
        lp.claimProtocolFees();
        assertEq(treasury.balance, pf);
    }

    function test_DepositForfeit() public {
        address t = _launch("SPAM", 0);
        vm.expectRevert(Launchpad.TooEarly.selector);
        lp.forfeitDeposit(t);
        vm.warp(block.timestamp + 30 days);
        lp.forfeitDeposit(t);
        assertEq(lp.pendingDeposits(), 0);
        assertEq(lp.protocolFees(), FEE + DEPOSIT);
    }

    function test_OwnerCannotPauseTrading() public {
        address t = _launch("PAUSE", 0);
        lp.setConfig(treasury, FEE, DEPOSIT, V0, true);
        vm.warp(block.timestamp + WINDOW);
        vm.prank(alice);
        lp.buy{value: 0.01 ether}(t, 0, alice, address(0)); // still works
        address[] memory team = new address[](0);
        vm.prank(creator);
        vm.expectRevert(Launchpad.Paused.selector);
        lp.launch{value: 1 ether}("X", "X", "", team, 0, address(0));
    }

    // ------------------------------------------------------------ fuzz

    function testFuzz_BuySellNeverInsolvent(uint96 a, uint96 b, uint96 s) public {
        address t = _launch("FUZZ", 0);
        vm.warp(block.timestamp + WINDOW);
        uint256 amtA = bound(uint256(a), 1e9, 3 ether);
        uint256 amtB = bound(uint256(b), 1e9, 3 ether);

        vm.prank(alice);
        uint256 gotA = lp.buy{value: amtA}(t, 0, alice, ref);
        if (lp.getCoin(t).pool == address(0)) {
            vm.prank(bob);
            try lp.buy{value: amtB}(t, 0, bob, address(0)) {} catch {}
        }
        if (lp.getCoin(t).pool == address(0)) {
            uint256 sellAmt = bound(uint256(s), 1, gotA);
            vm.prank(alice);
            try lp.sell(t, sellAmt, 0, alice, address(0)) {} catch {}
        }
        _solvent();
    }

    function testFuzz_CannotProfitFromRoundTrip(uint96 a) public {
        address t = _launch("ARB", 0);
        vm.warp(block.timestamp + WINDOW);
        uint256 amt = bound(uint256(a), 1e6, 0.28 ether);
        uint256 before = alice.balance;
        vm.prank(alice);
        uint256 got = lp.buy{value: amt}(t, 0, alice, address(0));
        if (lp.getCoin(t).pool != address(0)) return;
        vm.prank(alice);
        try lp.sell(t, got, 0, alice, address(0)) {} catch {}
        assertLe(alice.balance, before);
    }
}
