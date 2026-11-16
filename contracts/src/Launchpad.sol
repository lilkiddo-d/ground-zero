// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {LaunchToken} from "./LaunchToken.sol";
import {Pool} from "./Pool.sol";
import {Clones} from "./lib/Clones.sol";

/// @title Launchpad
/// @notice Launch a coin in one transaction, trade it on a bonding curve, and graduate it into a
///         locked Pool when the curve fills, all within the same buy.
///
///         Curve: constant product on virtual reserves (pump.fun model).
///           - 1,000,000,000 supply; 793,100,000 sold on the curve; 206,900,000 reserved for the pool.
///           - Starting virtual reserves: `initialVirtualNative` native x 1,073,000,000 tokens.
///         Fees (fixed in code, cannot be changed for any coin):
///           - 1% on every buy and sell. The creator gets 50% of it on the curve, 60% after graduation,
///             and 75% once the coin has kept trading for 7 days after graduation.
///           - Sniper fee: buys in the first `sniperWindow` seconds pay a fee that falls linearly from
///             99% to 1%. Half goes to the creator. The creator and up to 5 team wallets are exempt.
///           - Copies: if a coin reuses the ticker of an earlier coin that traded in the last 7 days,
///             half of the copy's creator share goes to the original's creator.
///           - Referrers (apps, bots, links) earn 10% of the protocol share of the trades they bring.
///           - 3% of the raise at graduation.
///         Launch costs `creationFee` (kept) plus `launchDeposit` (returned to the creator at graduation,
///         forfeited if the coin has not graduated after 30 days).
contract Launchpad {
    // ----------------------------------------------------------------- constants

    uint256 public constant TOTAL_SUPPLY = 1_000_000_000e18;
    uint256 public constant CURVE_SUPPLY = 793_100_000e18;
    uint256 public constant LP_RESERVE = 206_900_000e18;
    uint256 public constant VIRTUAL_TOKEN = 1_073_000_000e18;

    uint256 public constant TRADE_FEE_BPS = 100; // 1%
    uint256 public constant SNIPER_START_BPS = 9_900; // 99%
    uint256 public constant GRADUATION_FEE_BPS = 300; // 3%
    uint256 public constant CREATOR_SHARE_CURVE_BPS = 5_000; // of the fee
    uint256 public constant CREATOR_SHARE_POOL_BPS = 6_000;
    uint256 public constant CREATOR_SHARE_MATURE_BPS = 7_500;
    uint256 public constant SNIPER_CREATOR_SHARE_BPS = 5_000;
    uint256 public constant ORIGINAL_CUT_BPS = 5_000; // of the copy's creator share
    uint256 public constant REFERRAL_SHARE_BPS = 1_000; // of the protocol share
    uint256 public constant MATURE_AFTER = 7 days;
    uint256 public constant ORIGINAL_LIVE_WINDOW = 7 days;
    uint256 public constant DEPOSIT_FORFEIT_AFTER = 30 days;
    uint256 public constant MAX_TEAM_WALLETS = 5;
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;
    uint256 private constant BPS = 10_000;

    // ----------------------------------------------------------------- config

    address public immutable tokenImplementation;
    address public immutable poolImplementation;
    uint256 public immutable sniperWindow;

    address public owner;
    address public treasury;
    uint256 public creationFee;
    uint256 public launchDeposit;
    uint256 public initialVirtualNative;
    bool public launchesPaused; // only blocks new launches; trading can never be paused

    // ----------------------------------------------------------------- state

    struct Coin {
        address creator;
        uint40 launchedAt;
        uint40 graduatedAt;
        uint40 lastTradeAt;
        address pool;
        address originalOf;
        uint256 initialVirtualNative;
        uint256 virtualNative;
        uint256 virtualToken;
        uint256 realNative;
        uint256 tokensSold;
        uint256 deposit;
        uint256 creatorFeesEarned;
    }

    mapping(address => Coin) public coins;
    address[] public allCoins;
    mapping(address => address[]) internal _coinsByCreator;
    mapping(bytes32 => address) public firstWithTicker;
    mapping(address => mapping(address => bool)) public sniperExempt;

    mapping(address => uint256) public claimable;
    uint256 public protocolFees;
    uint256 public pendingDeposits;

    uint256 private _lock;

    // ----------------------------------------------------------------- events

    event CoinLaunched(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        string uri,
        address originalOf,
        uint256 virtualNative,
        uint256 virtualToken,
        address[] team
    );
    event Trade(
        address indexed token,
        address indexed trader,
        bool isBuy,
        uint256 nativeAmount,
        uint256 tokenAmount,
        uint256 fee,
        uint256 virtualNative,
        uint256 virtualToken,
        uint256 tokensSold
    );
    event Graduated(
        address indexed token, address pool, uint256 nativeLiquidity, uint256 tokenLiquidity, uint256 tokensBurned
    );
    event FeeAccrued(address indexed token, address indexed recipient, uint256 amount, uint8 kind); // 0 creator, 1 original, 2 referral
    event Claimed(address indexed account, uint256 amount);
    event DepositForfeited(address indexed token, uint256 amount);
    event ConfigUpdated(address treasury, uint256 creationFee, uint256 launchDeposit, uint256 initialVirtualNative, bool paused);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ----------------------------------------------------------------- errors

    error NotOwner();
    error NotPool();
    error Paused();
    error BadName();
    error BadSymbol();
    error BadUri();
    error TooManyTeamWallets();
    error InsufficientPayment();
    error UnknownCoin();
    error AlreadyGraduated();
    error Slippage();
    error ZeroAmount();
    error Reentrancy();
    error TransferFailed();
    error TooEarly();
    error BadConfig();

    modifier nonReentrant() {
        if (_lock == 1) revert Reentrancy();
        _lock = 1;
        _;
        _lock = 0;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(
        address treasury_,
        uint256 creationFee_,
        uint256 launchDeposit_,
        uint256 initialVirtualNative_,
        uint256 sniperWindow_
    ) {
        if (treasury_ == address(0) || initialVirtualNative_ == 0) revert BadConfig();
        tokenImplementation = address(new LaunchToken());
        poolImplementation = address(new Pool());
        sniperWindow = sniperWindow_;
        owner = msg.sender;
        treasury = treasury_;
        creationFee = creationFee_;
        launchDeposit = launchDeposit_;
        initialVirtualNative = initialVirtualNative_;
        emit OwnershipTransferred(address(0), msg.sender);
        emit ConfigUpdated(treasury_, creationFee_, launchDeposit_, initialVirtualNative_, false);
    }

    // ================================================================= launch

    /// @notice Launch a coin. Send `creationFee + launchDeposit` plus any amount you want to buy in the
    ///         same transaction (the creator never pays the sniper fee, so nobody can buy before you).
    function launch(
        string calldata name,
        string calldata symbol,
        string calldata uri,
        address[] calldata team,
        uint256 minTokensOut,
        address referrer
    ) external payable nonReentrant returns (address token) {
        if (launchesPaused) revert Paused();
        uint256 nameLen = bytes(name).length;
        uint256 symLen = bytes(symbol).length;
        if (nameLen == 0 || nameLen > 32) revert BadName();
        if (symLen == 0 || symLen > 10) revert BadSymbol();
        if (bytes(uri).length > 256) revert BadUri();
        if (team.length > MAX_TEAM_WALLETS) revert TooManyTeamWallets();

        uint256 upfront = creationFee + launchDeposit;
        if (msg.value < upfront) revert InsufficientPayment();

        token = Clones.clone(tokenImplementation);
        LaunchToken(token).initialize(name, symbol, uri);

        Coin storage c = coins[token];
        c.creator = msg.sender;
        c.launchedAt = uint40(block.timestamp);
        c.lastTradeAt = uint40(block.timestamp);
        c.initialVirtualNative = initialVirtualNative;
        c.virtualNative = initialVirtualNative;
        c.virtualToken = VIRTUAL_TOKEN;
        c.deposit = launchDeposit;

        bytes32 tickerHash = _tickerHash(symbol);
        address first = firstWithTicker[tickerHash];
        if (first == address(0)) firstWithTicker[tickerHash] = token;
        else c.originalOf = first;

        sniperExempt[token][msg.sender] = true;
        for (uint256 i; i < team.length; ++i) {
            sniperExempt[token][team[i]] = true;
        }

        protocolFees += creationFee;
        pendingDeposits += launchDeposit;
        allCoins.push(token);
        _coinsByCreator[msg.sender].push(token);

        emit CoinLaunched(token, msg.sender, name, symbol, uri, c.originalOf, c.virtualNative, c.virtualToken, team);

        uint256 buyAmount = msg.value - upfront;
        if (buyAmount > 0) {
            _buy(token, c, buyAmount, minTokensOut, msg.sender, referrer);
        }
    }

    // ================================================================= curve trading

    function buy(address token, uint256 minTokensOut, address recipient, address referrer)
        external
        payable
        nonReentrant
        returns (uint256 tokensOut)
    {
        Coin storage c = _coin(token);
        if (msg.value == 0) revert ZeroAmount();
        tokensOut = _buy(token, c, msg.value, minTokensOut, recipient == address(0) ? msg.sender : recipient, referrer);
    }

    function sell(address token, uint256 tokensIn, uint256 minNativeOut, address recipient, address referrer)
        external
        nonReentrant
        returns (uint256 nativeOut)
    {
        Coin storage c = _coin(token);
        if (c.pool != address(0)) revert AlreadyGraduated();
        if (tokensIn == 0) revert ZeroAmount();

        uint256 gross;
        uint256 fee;
        uint256 newVN;
        (nativeOut, fee, gross, newVN) = _quoteSell(c, tokensIn);
        if (nativeOut == 0 || nativeOut < minNativeOut) revert Slippage();

        // Pulls only from the caller (the token trusts the launchpad, so no approval is needed).
        LaunchToken(token).transferFrom(msg.sender, address(this), tokensIn);

        c.virtualNative = newVN;
        c.virtualToken += tokensIn;
        c.realNative -= gross;
        c.tokensSold -= tokensIn;
        c.lastTradeAt = uint40(block.timestamp);

        _distributeFee(token, c, fee, CREATOR_SHARE_CURVE_BPS, referrer, msg.sender);

        emit Trade(token, msg.sender, false, nativeOut, tokensIn, fee, c.virtualNative, c.virtualToken, c.tokensSold);

        _send(recipient == address(0) ? msg.sender : recipient, nativeOut);
    }

    function _buy(
        address token,
        Coin storage c,
        uint256 value,
        uint256 minTokensOut,
        address recipient,
        address referrer
    ) internal returns (uint256 tokensOut) {
        if (c.pool != address(0)) revert AlreadyGraduated();

        uint256 feeBps = currentBuyFeeBps(token, msg.sender);
        (uint256 out, uint256 fee, uint256 netIn, uint256 refund, uint256 newVN, uint256 newVT) =
            _quoteBuy(c, value, feeBps);
        tokensOut = out;
        if (tokensOut == 0 || tokensOut < minTokensOut) revert Slippage();

        c.virtualNative = newVN;
        c.virtualToken = newVT;
        c.realNative += netIn;
        c.tokensSold += tokensOut;
        c.lastTradeAt = uint40(block.timestamp);

        _distributeFee(token, c, fee, feeBps > TRADE_FEE_BPS ? 0 : CREATOR_SHARE_CURVE_BPS, referrer, msg.sender);

        LaunchToken(token).transfer(recipient, tokensOut);
        emit Trade(token, msg.sender, true, value - refund, tokensOut, fee, newVN, newVT, c.tokensSold);

        if (c.tokensSold == CURVE_SUPPLY) _graduate(token, c);
        if (refund > 0) _send(msg.sender, refund);
    }

    // ================================================================= graduation

    function _graduate(address token, Coin storage c) internal {
        uint256 raised = c.realNative;
        uint256 gradFee = (raised * GRADUATION_FEE_BPS) / BPS;
        uint256 nativeLiquidity = raised - gradFee;
        // Seed the pool at exactly the curve's final price: no jump.
        uint256 tokenLiquidity = (nativeLiquidity * c.virtualToken) / c.virtualNative;
        if (tokenLiquidity > LP_RESERVE) tokenLiquidity = LP_RESERVE;
        uint256 burned = LP_RESERVE - tokenLiquidity;

        c.realNative = 0;
        c.graduatedAt = uint40(block.timestamp);
        protocolFees += gradFee;

        if (c.deposit > 0) {
            uint256 dep = c.deposit;
            c.deposit = 0;
            pendingDeposits -= dep;
            claimable[c.creator] += dep;
        }

        address pool = Clones.clone(poolImplementation);
        c.pool = pool;
        LaunchToken(token).setPool(pool);
        LaunchToken(token).transfer(pool, tokenLiquidity);
        if (burned > 0) LaunchToken(token).transfer(DEAD, burned);
        Pool(pool).initialize{value: nativeLiquidity}(token, tokenLiquidity);

        emit Graduated(token, pool, nativeLiquidity, tokenLiquidity, burned);
    }

    /// @notice Fee hook for graduated pools. Only the coin's own pool can call it.
    function creditPoolFee(address token, address trader, address referrer) external payable {
        Coin storage c = coins[token];
        if (c.pool == address(0) || msg.sender != c.pool) revert NotPool();
        c.lastTradeAt = uint40(block.timestamp);
        uint256 share = block.timestamp >= uint256(c.graduatedAt) + MATURE_AFTER
            ? CREATOR_SHARE_MATURE_BPS
            : CREATOR_SHARE_POOL_BPS;
        _distributeFee(token, c, msg.value, share, referrer, trader);
    }

    // ================================================================= fees & claims

    /// @dev creatorShareBps == 0 means "sniper fee" (creator gets SNIPER_CREATOR_SHARE_BPS).
    function _distributeFee(
        address token,
        Coin storage c,
        uint256 fee,
        uint256 creatorShareBps,
        address referrer,
        address trader
    ) internal {
        if (fee == 0) return;
        uint256 creatorPart = (fee * (creatorShareBps == 0 ? SNIPER_CREATOR_SHARE_BPS : creatorShareBps)) / BPS;

        uint256 originalCut;
        address orig = c.originalOf;
        if (orig != address(0)) {
            Coin storage o = coins[orig];
            if (block.timestamp <= uint256(o.lastTradeAt) + ORIGINAL_LIVE_WINDOW) {
                originalCut = (creatorPart * ORIGINAL_CUT_BPS) / BPS;
                claimable[o.creator] += originalCut;
                o.creatorFeesEarned += originalCut;
                emit FeeAccrued(orig, o.creator, originalCut, 1);
            }
        }

        uint256 toCreator = creatorPart - originalCut;
        claimable[c.creator] += toCreator;
        c.creatorFeesEarned += toCreator;
        emit FeeAccrued(token, c.creator, toCreator, 0);

        uint256 rest = fee - creatorPart;
        if (referrer != address(0) && referrer != trader) {
            uint256 r = (rest * REFERRAL_SHARE_BPS) / BPS;
            claimable[referrer] += r;
            rest -= r;
            emit FeeAccrued(token, referrer, r, 2);
        }
        protocolFees += rest;
    }

    /// @notice Claim creator fees, referral fees and refunded launch deposits.
    function claim() external nonReentrant returns (uint256 amount) {
        amount = claimable[msg.sender];
        if (amount == 0) revert ZeroAmount();
        claimable[msg.sender] = 0;
        emit Claimed(msg.sender, amount);
        _send(msg.sender, amount);
    }

    /// @notice Sends accumulated protocol fees to the treasury. Anyone can call it.
    function claimProtocolFees() external nonReentrant returns (uint256 amount) {
        amount = protocolFees;
        if (amount == 0) revert ZeroAmount();
        protocolFees = 0;
        emit Claimed(treasury, amount);
        _send(treasury, amount);
    }

    /// @notice A coin that has not graduated 30 days after launch loses its deposit. Anyone can call it.
    function forfeitDeposit(address token) external {
        Coin storage c = _coin(token);
        if (c.pool != address(0) || block.timestamp < uint256(c.launchedAt) + DEPOSIT_FORFEIT_AFTER) revert TooEarly();
        uint256 dep = c.deposit;
        if (dep == 0) revert ZeroAmount();
        c.deposit = 0;
        pendingDeposits -= dep;
        protocolFees += dep;
        emit DepositForfeited(token, dep);
    }

    // ================================================================= quotes & views

    function currentBuyFeeBps(address token, address trader) public view returns (uint256) {
        if (sniperExempt[token][trader]) return TRADE_FEE_BPS;
        uint256 elapsed = block.timestamp - coins[token].launchedAt;
        if (elapsed >= sniperWindow) return TRADE_FEE_BPS;
        return SNIPER_START_BPS - ((SNIPER_START_BPS - TRADE_FEE_BPS) * elapsed) / sniperWindow;
    }

    function quoteBuy(address token, uint256 nativeIn, address trader)
        external
        view
        returns (uint256 tokensOut, uint256 fee, uint256 refund, bool graduates)
    {
        Coin storage c = _coin(token);
        if (c.pool != address(0)) {
            (tokensOut, fee) = Pool(c.pool).quoteBuy(nativeIn);
            return (tokensOut, fee, 0, false);
        }
        (tokensOut, fee,, refund,,) = _quoteBuy(c, nativeIn, currentBuyFeeBps(token, trader));
        graduates = c.tokensSold + tokensOut == CURVE_SUPPLY;
    }

    function quoteSell(address token, uint256 tokensIn) external view returns (uint256 nativeOut, uint256 fee) {
        Coin storage c = _coin(token);
        if (c.pool != address(0)) return Pool(c.pool).quoteSell(tokensIn);
        (nativeOut, fee,,) = _quoteSell(c, tokensIn);
    }

    /// @notice Native (fee included) still needed to fill the curve.
    function nativeToGraduate(address token) public view returns (uint256) {
        Coin storage c = _coin(token);
        if (c.pool != address(0)) return 0;
        uint256 newVT = c.virtualToken - (CURVE_SUPPLY - c.tokensSold);
        uint256 netIn = _ceilDiv(c.virtualNative * c.virtualToken, newVT) - c.virtualNative;
        return _ceilDiv(netIn * BPS, BPS - TRADE_FEE_BPS);
    }

    struct CoinView {
        address token;
        string name;
        string symbol;
        string uri;
        address creator;
        uint40 launchedAt;
        uint40 graduatedAt;
        uint40 lastTradeAt;
        address pool;
        address originalOf;
        uint256 priceWad; // native per whole token, 1e18-scaled
        uint256 marketCap; // in native wei
        uint256 progressBps; // tokens sold / curve supply
        uint256 reserveNative; // real native on the curve, or pool reserve
        uint256 reserveToken;
        uint256 virtualNative;
        uint256 virtualToken;
        uint256 tokensSold;
        uint256 nativeToGraduate;
        uint256 creatorFeesEarned;
    }

    function coinCount() external view returns (uint256) {
        return allCoins.length;
    }

    function getCoin(address token) public view returns (CoinView memory v) {
        Coin storage c = _coin(token);
        LaunchToken t = LaunchToken(token);
        v.token = token;
        v.name = t.name();
        v.symbol = t.symbol();
        v.uri = t.tokenURI();
        v.creator = c.creator;
        v.launchedAt = c.launchedAt;
        v.graduatedAt = c.graduatedAt;
        v.lastTradeAt = c.lastTradeAt;
        v.pool = c.pool;
        v.originalOf = c.originalOf;
        v.virtualNative = c.virtualNative;
        v.virtualToken = c.virtualToken;
        v.tokensSold = c.tokensSold;
        v.creatorFeesEarned = c.creatorFeesEarned;
        if (c.pool != address(0)) {
            Pool p = Pool(c.pool);
            v.reserveNative = p.reserveNative();
            v.reserveToken = p.reserveToken();
            v.priceWad = v.reserveToken == 0 ? 0 : (v.reserveNative * 1e18) / v.reserveToken;
            v.progressBps = BPS;
        } else {
            v.reserveNative = c.realNative;
            v.reserveToken = TOTAL_SUPPLY - c.tokensSold;
            v.priceWad = (c.virtualNative * 1e18) / c.virtualToken;
            v.progressBps = (c.tokensSold * BPS) / CURVE_SUPPLY;
            v.nativeToGraduate = nativeToGraduate(token);
        }
        v.marketCap = (v.priceWad * TOTAL_SUPPLY) / 1e18;
    }

    /// @notice Newest first. `offset` counts from the newest coin.
    function getCoins(uint256 offset, uint256 limit) external view returns (CoinView[] memory out) {
        uint256 n = allCoins.length;
        if (offset >= n) return out;
        uint256 count = n - offset < limit ? n - offset : limit;
        out = new CoinView[](count);
        for (uint256 i; i < count; ++i) {
            out[i] = getCoin(allCoins[n - 1 - offset - i]);
        }
    }

    function coinsByCreator(address creator) external view returns (address[] memory) {
        return _coinsByCreator[creator];
    }

    // ================================================================= admin

    function setConfig(address treasury_, uint256 creationFee_, uint256 launchDeposit_, uint256 initialVirtualNative_, bool paused_)
        external
        onlyOwner
    {
        if (treasury_ == address(0) || initialVirtualNative_ == 0) revert BadConfig();
        treasury = treasury_;
        creationFee = creationFee_;
        launchDeposit = launchDeposit_;
        initialVirtualNative = initialVirtualNative_;
        launchesPaused = paused_;
        emit ConfigUpdated(treasury_, creationFee_, launchDeposit_, initialVirtualNative_, paused_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ================================================================= internals

    function _coin(address token) internal view returns (Coin storage c) {
        c = coins[token];
        if (c.creator == address(0)) revert UnknownCoin();
    }

    function _quoteBuy(Coin storage c, uint256 value, uint256 feeBps)
        internal
        view
        returns (uint256 out, uint256 fee, uint256 netIn, uint256 refund, uint256 newVN, uint256 newVT)
    {
        uint256 vN = c.virtualNative;
        uint256 vT = c.virtualToken;
        uint256 k = vN * vT;

        fee = (value * feeBps) / BPS;
        netIn = value - fee;
        newVN = vN + netIn;
        newVT = _ceilDiv(k, newVN); // round in the curve's favour
        out = vT - newVT;

        uint256 remaining = CURVE_SUPPLY - c.tokensSold;
        if (out >= remaining) {
            // Only pay for what is left; refund the rest.
            out = remaining;
            newVT = vT - remaining;
            newVN = _ceilDiv(k, newVT);
            netIn = newVN - vN;
            uint256 gross = _ceilDiv(netIn * BPS, BPS - feeBps);
            if (gross > value) gross = value;
            fee = gross - netIn;
            refund = value - gross;
        }
    }

    function _quoteSell(Coin storage c, uint256 tokensIn)
        internal
        view
        returns (uint256 nativeOut, uint256 fee, uint256 gross, uint256 newVN)
    {
        uint256 vN = c.virtualNative;
        newVN = _ceilDiv(vN * c.virtualToken, c.virtualToken + tokensIn);
        gross = vN - newVN;
        // Never true while realNative == virtualNative - initialVirtualNative; kept as a hard solvency guard.
        if (gross > c.realNative) revert Slippage();
        fee = (gross * TRADE_FEE_BPS) / BPS;
        nativeOut = gross - fee;
    }

    function _tickerHash(string calldata symbol) internal pure returns (bytes32) {
        bytes memory b = bytes(symbol);
        for (uint256 i; i < b.length; ++i) {
            if (b[i] >= 0x61 && b[i] <= 0x7A) b[i] = bytes1(uint8(b[i]) - 32); // a-z -> A-Z
        }
        return keccak256(b);
    }

    function _send(address to, uint256 amount) internal {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function _ceilDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        return a == 0 ? 0 : (a - 1) / b + 1;
    }
}
