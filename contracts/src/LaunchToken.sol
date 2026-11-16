// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title LaunchToken
/// @notice Fixed-supply ERC-20 used for every coin. Deployed as an EIP-1167 clone by the Launchpad.
///         1,000,000,000 tokens are minted once to the Launchpad. There is no owner, no mint, no pause,
///         no blacklist and no transfer tax: if you can buy it, you can sell it.
/// @dev The Launchpad and the coin's own graduated Pool may move tokens out of `msg.sender`'s balance
///      without a prior approval. They only ever pull from the address that called them, so this saves
///      users an approval transaction without giving anyone else access to their tokens.
contract LaunchToken {
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000e18;

    string public name;
    string public symbol;
    string public tokenURI; // ipfs:// metadata (image, description, links)
    uint8 public constant decimals = 18;

    address public launchpad;
    address public pool; // set once at graduation

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error AlreadyInitialized();
    error NotLaunchpad();
    error InsufficientBalance();
    error InsufficientAllowance();

    function initialize(string calldata name_, string calldata symbol_, string calldata uri_) external {
        if (launchpad != address(0)) revert AlreadyInitialized();
        launchpad = msg.sender;
        name = name_;
        symbol = symbol_;
        tokenURI = uri_;
        balanceOf[msg.sender] = TOTAL_SUPPLY;
        emit Transfer(address(0), msg.sender, TOTAL_SUPPLY);
    }

    function totalSupply() external pure returns (uint256) {
        return TOTAL_SUPPLY;
    }

    function setPool(address pool_) external {
        if (msg.sender != launchpad) revert NotLaunchpad();
        pool = pool_;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (msg.sender != launchpad && (msg.sender != pool || pool == address(0))) {
            uint256 allowed = allowance[from][msg.sender];
            if (allowed != type(uint256).max) {
                if (allowed < amount) revert InsufficientAllowance();
                allowance[from][msg.sender] = allowed - amount;
            }
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        uint256 bal = balanceOf[from];
        if (bal < amount) revert InsufficientBalance();
        unchecked {
            balanceOf[from] = bal - amount;
            balanceOf[to] += amount; // cannot overflow: total supply is fixed
        }
        emit Transfer(from, to, amount);
    }
}
