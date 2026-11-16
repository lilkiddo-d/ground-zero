// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {Launchpad} from "../src/Launchpad.sol";

/// Deploy:
///   forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --private-key $PRIVATE_KEY
/// Env (all optional): TREASURY, CREATION_FEE, LAUNCH_DEPOSIT, VIRTUAL_NATIVE, SNIPER_WINDOW
contract Deploy is Script {
    function run() external returns (Launchpad lp) {
        address treasury = vm.envOr("TREASURY", msg.sender);
        uint256 creationFee = vm.envOr("CREATION_FEE", uint256(0.0001 ether));
        uint256 deposit = vm.envOr("LAUNCH_DEPOSIT", uint256(0.002 ether));
        uint256 virtualNative = vm.envOr("VIRTUAL_NATIVE", uint256(0.1 ether));
        uint256 window = vm.envOr("SNIPER_WINDOW", uint256(5));

        vm.startBroadcast();
        lp = new Launchpad(treasury, creationFee, deposit, virtualNative, window);
        vm.stopBroadcast();

        console.log("Launchpad:", address(lp));
        string memory json = string.concat(
            '{"chainId":', vm.toString(block.chainid),
            ',"launchpad":"', vm.toString(address(lp)),
            '","startBlock":', vm.toString(block.number), "}"
        );
        vm.writeFile(string.concat("deployments/", vm.toString(block.chainid), ".json"), json);
    }
}
