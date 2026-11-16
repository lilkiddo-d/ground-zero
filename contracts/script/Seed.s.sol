// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {Launchpad} from "../src/Launchpad.sol";

/// Local demo data. Uses anvil's default funded accounts.
///   LAUNCHPAD=0x... forge script script/Seed.s.sol --rpc-url local --broadcast
contract Seed is Script {
    function run() external {
        Launchpad lp = Launchpad(vm.envAddress("LAUNCHPAD"));
        string memory mnemonic = "test test test test test test test test test test test junk"; // anvil default
        uint256[4] memory keys;
        for (uint32 i; i < 4; ++i) keys[i] = vm.deriveKey(mnemonic, i);
        string[6] memory names = ["Seismic Cat", "Ground Dog", "Aftershock", "Fault Line", "Tremor", "Magma Frog"];
        string[6] memory syms = ["SCAT", "GDOG", "SHOCK", "FAULT", "TREM", "MFROG"];
        uint256[6] memory initial = [uint256(0.02 ether), 0.05 ether, 0.01 ether, 0.08 ether, 0, 0.03 ether];
        address[] memory team = new address[](0);
        uint256 fee = lp.creationFee() + lp.launchDeposit();

        address[6] memory tokens;
        for (uint256 i; i < 6; ++i) {
            vm.broadcast(keys[i % 4]);
            tokens[i] = lp.launch{value: fee + initial[i]}(names[i], syms[i], "", team, 0, address(0));
        }
        // trades from other wallets (after the sniper window on a real chain; anvil timestamps move per block)
        for (uint256 r; r < 3; ++r) {
            for (uint256 i; i < 6; ++i) {
                vm.broadcast(keys[(i + r + 1) % 4]);
                lp.buy{value: 0.004 ether * (r + 1) * (i + 1)}(tokens[i], 0, address(0), address(0));
            }
        }
        // graduate one coin
        uint256 need = lp.nativeToGraduate(tokens[3]);
        vm.broadcast(keys[2]);
        lp.buy{value: need + 0.01 ether}(tokens[3], 0, address(0), address(0));
    }
}
