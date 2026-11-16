// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {LaunchToken} from "./LaunchToken.sol";

interface ILaunchpadFees {
    function creditPoolFee(address token, address trader, address referrer) external payable;
}

/// @title Pool
/// @notice Constant-product AMM (native <-> coin) that a coin moves into when its curve fills.
///         Deployed as an EIP-1167 clone by the Launchpad at graduation; nobody else can create one.
///         There are no LP shares and no withdraw function, so the liquidity is locked forever by construction.
///         A 1% fee is taken on the native side of every swap and sent to the Launchpad for the fee split.
contract Pool {
    uint256 public constant FEE_BPS = 100; // 1%
    uint256 private constant BPS = 10_000;

    address public launchpad;
    LaunchToken public token;
    uint256 public reserveNative;
    uint256 public reserveToken;

    uint256 private _lock;

    event Swap(
        address indexed trader,
        bool isBuy,
        uint256 nativeAmount,
        uint256 tokenAmount,
        uint256 fee,
        uint256 reserveNative,
        uint256 reserveToken
    );

    error AlreadyInitialized();
    error NotLaunchpad();
    error Slippage();
    error ZeroAmount();
    error Reentrancy();
    error TransferFailed();

    modifier nonReentrant() {
        if (_lock == 1) revert Reentrancy();
        _lock = 1;
        _;
        _lock = 0;
    }

    /// @dev Called by the Launchpad in the same transaction that funds the pool.
    function initialize(address token_, uint256 tokenAmount) external payable {
        if (launchpad != address(0)) revert AlreadyInitialized();
        launchpad = msg.sender;
        token = LaunchToken(token_);
        reserveNative = msg.value;
        reserveToken = tokenAmount;
    }

    // ------------------------------------------------------------------ quotes

    function quoteBuy(uint256 nativeIn) public view returns (uint256 tokensOut, uint256 fee) {
        fee = (nativeIn * FEE_BPS) / BPS;
        uint256 netIn = nativeIn - fee;
        tokensOut = (reserveToken * netIn) / (reserveNative + netIn);
    }

    function quoteSell(uint256 tokensIn) public view returns (uint256 nativeOut, uint256 fee) {
        uint256 gross = (reserveNative * tokensIn) / (reserveToken + tokensIn);
        fee = (gross * FEE_BPS) / BPS;
        nativeOut = gross - fee;
    }

    function price() external view returns (uint256) {
        return reserveToken == 0 ? 0 : (reserveNative * 1e18) / reserveToken;
    }

    // ------------------------------------------------------------------ swaps

    function buy(uint256 minTokensOut, address recipient, address referrer)
        external
        payable
        nonReentrant
        returns (uint256 tokensOut)
    {
        if (msg.value == 0) revert ZeroAmount();
        uint256 fee;
        (tokensOut, fee) = quoteBuy(msg.value);
        if (tokensOut == 0 || tokensOut < minTokensOut) revert Slippage();

        reserveNative += msg.value - fee;
        reserveToken -= tokensOut;

        ILaunchpadFees(launchpad).creditPoolFee{value: fee}(address(token), msg.sender, referrer);
        token.transfer(recipient == address(0) ? msg.sender : recipient, tokensOut);

        emit Swap(msg.sender, true, msg.value, tokensOut, fee, reserveNative, reserveToken);
    }

    function sell(uint256 tokensIn, uint256 minNativeOut, address recipient, address referrer)
        external
        nonReentrant
        returns (uint256 nativeOut)
    {
        if (tokensIn == 0) revert ZeroAmount();
        uint256 fee;
        (nativeOut, fee) = quoteSell(tokensIn);
        if (nativeOut == 0 || nativeOut < minNativeOut) revert Slippage();

        // Pulls only from the caller (no approval needed: the token trusts its own pool).
        token.transferFrom(msg.sender, address(this), tokensIn);

        reserveToken += tokensIn;
        reserveNative -= nativeOut + fee;

        ILaunchpadFees(launchpad).creditPoolFee{value: fee}(address(token), msg.sender, referrer);
        (bool ok,) = (recipient == address(0) ? msg.sender : recipient).call{value: nativeOut}("");
        if (!ok) revert TransferFailed();

        emit Swap(msg.sender, false, nativeOut, tokensIn, fee, reserveNative, reserveToken);
    }
}
