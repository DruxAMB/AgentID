// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "openzeppelin-contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title AgentID — public directory of AI agents on BOT Chain.
/// Anyone registers an agent (name, category, description); owners can edit
/// their agent's description. All state is public; the UI filters by category.
contract AgentID is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    struct Agent {
        address owner;
        string name;
        string category;
        string description;
        uint64 registeredAt;
        uint64 updatedAt;
    }

    Agent[] private _agents;

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed owner,
        string name,
        string category,
        string description
    );
    event AgentDescriptionUpdated(uint256 indexed agentId, string description);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address owner_) external initializer {
        __Ownable_init(owner_);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function register(
        string calldata name,
        string calldata category,
        string calldata description
    ) external returns (uint256 agentId) {
        require(bytes(name).length > 0 && bytes(name).length <= 64, "name length");
        require(bytes(category).length > 0 && bytes(category).length <= 32, "category length");
        require(bytes(description).length <= 512, "description length");

        agentId = _agents.length;
        _agents.push(
            Agent({
                owner: msg.sender,
                name: name,
                category: category,
                description: description,
                registeredAt: uint64(block.timestamp),
                updatedAt: uint64(block.timestamp)
            })
        );
        emit AgentRegistered(agentId, msg.sender, name, category, description);
    }

    function updateDescription(uint256 agentId, string calldata description) external {
        require(agentId < _agents.length, "no agent");
        require(_agents[agentId].owner == msg.sender, "not agent owner");
        require(bytes(description).length > 0 && bytes(description).length <= 512, "description length");

        _agents[agentId].description = description;
        _agents[agentId].updatedAt = uint64(block.timestamp);
        emit AgentDescriptionUpdated(agentId, description);
    }

    function agentCount() external view returns (uint256) {
        return _agents.length;
    }

    function agentAt(uint256 agentId) external view returns (Agent memory) {
        require(agentId < _agents.length, "no agent");
        return _agents[agentId];
    }

    /// @notice Page through the directory (newest last in storage order).
    function agentsPage(uint256 offset, uint256 limit) external view returns (Agent[] memory out) {
        uint256 n = _agents.length;
        if (offset >= n) return new Agent[](0);
        uint256 end = offset + limit;
        if (end > n) end = n;
        out = new Agent[](end - offset);
        for (uint256 i = offset; i < end; i++) out[i - offset] = _agents[i];
    }

    /// @notice Categories in use, for the UI filter dropdown (derived, gas-capped by callers).
    /// Frontend iterates agentsPage instead; this exists for SDK consumers.
    function ownerOf(uint256 agentId) external view returns (address) {
        require(agentId < _agents.length, "no agent");
        return _agents[agentId].owner;
    }

    uint256[48] private __gap;
}
