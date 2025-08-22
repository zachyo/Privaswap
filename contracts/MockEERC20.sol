// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockEERC20
 * @dev A working implementation with privacy features for hackathon
 * Uses commitment schemes for balance privacy
 */
contract MockEERC20 is ERC20, Ownable {
    // Mapping to store encrypted balances using commitment hashes
    mapping(address => uint256) private _encryptedBalances;

    // Mapping to store balance commitments (hash of balance + nonce)
    mapping(address => bytes32) private _balanceCommitments;

    // Mapping to store nonces for commitment schemes
    mapping(address => uint256) private _nonces;

    // eERC20 Registration system
    mapping(address => bool) public registeredUsers;
    mapping(address => bytes32) public userPublicKeys; // Simplified public key storage

    // Auditor system for regulatory compliance
    mapping(address => bool) public authorizedAuditors;
    address public primaryAuditor;

    // eERC20 operation tracking
    mapping(address => uint256) public lastOperationNonce;
    mapping(bytes32 => bool) public usedProofs; // Prevent proof replay

    // Events for encrypted operations
    event EncryptedTransfer(address indexed from, address indexed to, bytes32 encryptedAmount);
    event EncryptedMint(address indexed to, bytes32 encryptedAmount);
    event EncryptedBurn(address indexed from, bytes32 encryptedAmount);

    // eERC20 specific events
    event UserRegistered(address indexed user, bytes32 publicKey);
    event AuditorAuthorized(address indexed auditor);
    event AuditorRevoked(address indexed auditor);
    event EncryptedOperation(address indexed user, string operationType, bytes32 operationHash);
    event Deposit(address indexed user, uint256 amount, uint256 nonce);
    event Withdrawal(address indexed user, uint256 amount, uint256 nonce);
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
        // Set deployer as primary auditor
        primaryAuditor = msg.sender;
        authorizedAuditors[msg.sender] = true;
    }

    // ============ eERC20 COMPLIANCE FUNCTIONS ============

    /**
     * @dev Register user for encrypted operations (eERC20 Registration Operation)
     */
    function registerUser(bytes32 publicKey) external {
        require(!registeredUsers[msg.sender], "User already registered");
        require(publicKey != bytes32(0), "Invalid public key");

        registeredUsers[msg.sender] = true;
        userPublicKeys[msg.sender] = publicKey;

        emit UserRegistered(msg.sender, publicKey);
    }

    /**
     * @dev Check if user is registered for encrypted operations
     */
    function isUserRegistered(address user) external view returns (bool) {
        return registeredUsers[user];
    }

    /**
     * @dev Authorize an auditor for regulatory compliance
     */
    function authorizeAuditor(address auditor) external onlyOwner {
        require(auditor != address(0), "Invalid auditor address");
        authorizedAuditors[auditor] = true;
        emit AuditorAuthorized(auditor);
    }

    /**
     * @dev Revoke auditor authorization
     */
    function revokeAuditor(address auditor) external onlyOwner {
        authorizedAuditors[auditor] = false;
        emit AuditorRevoked(auditor);
    }

    /**
     * @dev Set primary auditor
     */
    function setPrimaryAuditor(address auditor) external onlyOwner {
        require(authorizedAuditors[auditor], "Auditor not authorized");
        primaryAuditor = auditor;
    }

    /**
     * @dev Get encrypted balance for auditor (regulatory compliance)
     */
    function getEncryptedBalanceForAuditor(address user) external view returns (uint256) {
        require(authorizedAuditors[msg.sender], "Not authorized auditor");
        return _encryptedBalances[user];
    }
    
    // ============ eERC20 CORE OPERATIONS ============

    /**
     * @dev eERC20 Deposit Operation - Convert ERC20 tokens to encrypted tokens
     */
    function depositToEncrypted(uint256 amount, uint256 nonce) external {
        require(registeredUsers[msg.sender], "User not registered");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        // Burn public tokens
        _burn(msg.sender, amount);

        // Add to encrypted balance
        _encryptedBalances[msg.sender] += amount;

        // Update commitment
        _nonces[msg.sender] = nonce;
        _balanceCommitments[msg.sender] = keccak256(abi.encodePacked(_encryptedBalances[msg.sender], nonce));
        lastOperationNonce[msg.sender] = nonce;

        // Emit events
        bytes32 operationHash = keccak256(abi.encodePacked("deposit", msg.sender, amount, nonce));
        emit EncryptedOperation(msg.sender, "deposit", operationHash);
        emit Deposit(msg.sender, amount, nonce);
    }

    /**
     * @dev eERC20 Withdrawal Operation - Convert encrypted tokens back to ERC20
     */
    function withdrawFromEncrypted(uint256 amount, uint256 nonce) external {
        require(registeredUsers[msg.sender], "User not registered");
        require(amount > 0, "Amount must be greater than 0");
        require(_encryptedBalances[msg.sender] >= amount, "Insufficient encrypted balance");

        // Verify commitment (simplified proof verification)
        bytes32 expectedCommitment = keccak256(abi.encodePacked(_encryptedBalances[msg.sender], _nonces[msg.sender]));
        require(_balanceCommitments[msg.sender] == expectedCommitment, "Invalid commitment");

        // Remove from encrypted balance
        _encryptedBalances[msg.sender] -= amount;

        // Update commitment
        _nonces[msg.sender] = nonce;
        _balanceCommitments[msg.sender] = keccak256(abi.encodePacked(_encryptedBalances[msg.sender], nonce));
        lastOperationNonce[msg.sender] = nonce;

        // Mint public tokens
        _mint(msg.sender, amount);

        // Emit events
        bytes32 operationHash = keccak256(abi.encodePacked("withdraw", msg.sender, amount, nonce));
        emit EncryptedOperation(msg.sender, "withdraw", operationHash);
        emit Withdrawal(msg.sender, amount, nonce);
    }

    /**
     * @dev Mint tokens to an address (public operation)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Burn tokens from an address (public operation)
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    /**
     * @dev eERC20 Transfer Operation - Transfer encrypted tokens with zero-knowledge proof
     * @param to Recipient address
     * @param amount Actual amount to transfer (in real implementation this would be encrypted)
     * @param nonce Nonce for commitment
     * @param zkProof Zero-knowledge proof (simplified as bytes32 for demo)
     */
    function encryptedTransfer(
        address to,
        uint256 amount,
        uint256 nonce,
        bytes32 zkProof
    ) external returns (bool) {
        require(registeredUsers[msg.sender], "Sender not registered");
        require(registeredUsers[to], "Recipient not registered");
        require(_encryptedBalances[msg.sender] >= amount, "Insufficient encrypted balance");
        require(!usedProofs[zkProof], "Proof already used");

        // Mark proof as used (prevent replay attacks)
        usedProofs[zkProof] = true;

        // Verify commitment (simplified proof verification)
        bytes32 expectedCommitment = keccak256(abi.encodePacked(_encryptedBalances[msg.sender], _nonces[msg.sender]));
        require(_balanceCommitments[msg.sender] == expectedCommitment, "Invalid sender commitment");

        // Update encrypted balances
        _encryptedBalances[msg.sender] -= amount;
        _encryptedBalances[to] += amount;

        // Update commitments
        _nonces[msg.sender] = nonce;
        _nonces[to] = nonce + 1;
        _balanceCommitments[msg.sender] = keccak256(abi.encodePacked(_encryptedBalances[msg.sender], _nonces[msg.sender]));
        _balanceCommitments[to] = keccak256(abi.encodePacked(_encryptedBalances[to], _nonces[to]));

        // Update operation nonces
        lastOperationNonce[msg.sender] = nonce;
        lastOperationNonce[to] = nonce + 1;

        // Create encrypted amount for event (commitment hash)
        bytes32 encryptedAmount = keccak256(abi.encodePacked(amount, nonce));

        // Emit events
        bytes32 operationHash = keccak256(abi.encodePacked("transfer", msg.sender, to, amount, nonce));
        emit EncryptedOperation(msg.sender, "transfer", operationHash);
        emit EncryptedTransfer(msg.sender, to, encryptedAmount);
        return true;
    }

    /**
     * @dev Backward compatibility - Transfer encrypted tokens (old interface)
     * @dev Works without registration for backward compatibility
     */
    function encryptedTransferLegacy(
        address to,
        uint256 amount,
        uint256 nonce
    ) external returns (bool) {
        require(_encryptedBalances[msg.sender] >= amount, "Insufficient encrypted balance");

        // Update encrypted balances
        _encryptedBalances[msg.sender] -= amount;
        _encryptedBalances[to] += amount;

        // Update commitments
        _nonces[msg.sender] = nonce;
        _nonces[to] = nonce + 1;
        _balanceCommitments[msg.sender] = keccak256(abi.encodePacked(_encryptedBalances[msg.sender], _nonces[msg.sender]));
        _balanceCommitments[to] = keccak256(abi.encodePacked(_encryptedBalances[to], _nonces[to]));

        // Create encrypted amount for event (commitment hash)
        bytes32 encryptedAmount = keccak256(abi.encodePacked(amount, nonce));
        emit EncryptedTransfer(msg.sender, to, encryptedAmount);
        return true;
    }
    
    /**
     * @dev eERC20 Mint Operation - Mint encrypted tokens directly to encrypted balance
     */
    function encryptedMint(
        address to,
        uint256 amount,
        uint256 nonce
    ) external onlyOwner returns (bool) {
        require(registeredUsers[to], "Recipient not registered");
        require(amount > 0, "Amount must be greater than 0");

        // Add to encrypted balance
        _encryptedBalances[to] += amount;

        // Update commitment
        _nonces[to] = nonce;
        _balanceCommitments[to] = keccak256(abi.encodePacked(_encryptedBalances[to], nonce));
        lastOperationNonce[to] = nonce;

        // Create encrypted amount for event
        bytes32 encryptedAmount = keccak256(abi.encodePacked(amount, nonce));

        // Emit events
        bytes32 operationHash = keccak256(abi.encodePacked("mint", to, amount, nonce));
        emit EncryptedOperation(to, "mint", operationHash);
        emit EncryptedMint(to, encryptedAmount);
        return true;
    }

    /**
     * @dev eERC20 Burn Operation - Burn encrypted tokens from encrypted balance
     */
    function encryptedBurn(
        uint256 amount,
        uint256 nonce
    ) external returns (bool) {
        require(registeredUsers[msg.sender], "User not registered");
        require(_encryptedBalances[msg.sender] >= amount, "Insufficient encrypted balance");

        // Verify commitment
        bytes32 expectedCommitment = keccak256(abi.encodePacked(_encryptedBalances[msg.sender], _nonces[msg.sender]));
        require(_balanceCommitments[msg.sender] == expectedCommitment, "Invalid commitment");

        _encryptedBalances[msg.sender] -= amount;
        _nonces[msg.sender] = nonce;
        _balanceCommitments[msg.sender] = keccak256(abi.encodePacked(_encryptedBalances[msg.sender], nonce));
        lastOperationNonce[msg.sender] = nonce;

        // Create encrypted amount for event
        bytes32 encryptedAmount = keccak256(abi.encodePacked(amount, nonce));

        // Emit events
        bytes32 operationHash = keccak256(abi.encodePacked("burn", msg.sender, amount, nonce));
        emit EncryptedOperation(msg.sender, "burn", operationHash);
        emit EncryptedBurn(msg.sender, encryptedAmount);
        return true;
    }
    
    /**
     * @dev Get encrypted balance (mock implementation)
     */
    function getEncryptedBalance(address account) external view returns (uint256) {
        return _encryptedBalances[account];
    }
    
    /**
     * @dev Set encrypted balance (for testing purposes only)
     */
    function setEncryptedBalance(address account, uint256 encryptedBalance) external onlyOwner {
        _encryptedBalances[account] = encryptedBalance;
    }
    
    /**
     * @dev Deposit regular ERC20 tokens to get encrypted tokens (legacy function)
     * @dev Backward compatibility - works without registration
     */
    function deposit(uint256 amount, uint256 nonce) external {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        // Burn public tokens
        _burn(msg.sender, amount);

        // Add to encrypted balance
        _encryptedBalances[msg.sender] += amount;

        // Update commitment
        _nonces[msg.sender] = nonce;
        _balanceCommitments[msg.sender] = keccak256(abi.encodePacked(_encryptedBalances[msg.sender], nonce));

        emit Deposit(msg.sender, amount, nonce);
    }

    // ============ eERC20 VIEW FUNCTIONS ============

    /**
     * @dev Get user's public key
     */
    function getUserPublicKey(address user) external view returns (bytes32) {
        return userPublicKeys[user];
    }

    /**
     * @dev Get user's last operation nonce
     */
    function getLastOperationNonce(address user) external view returns (uint256) {
        return lastOperationNonce[user];
    }

    /**
     * @dev Get user's balance commitment
     */
    function getBalanceCommitment(address user) external view returns (bytes32) {
        return _balanceCommitments[user];
    }

    /**
     * @dev Check if a proof has been used
     */
    function isProofUsed(bytes32 proof) external view returns (bool) {
        return usedProofs[proof];
    }

    /**
     * @dev Get current nonce for user
     */
    function getCurrentNonce(address user) external view returns (uint256) {
        return _nonces[user];
    }

    /**
     * @dev Withdraw encrypted tokens to get regular ERC20 tokens (legacy function)
     */
    function withdraw(uint256 amount, uint256 nonce) external {
        require(_encryptedBalances[msg.sender] >= amount, "Insufficient encrypted balance");

        // Verify commitment (simplified - in real implementation would use ZK proofs)
        bytes32 expectedCommitment = keccak256(abi.encodePacked(_encryptedBalances[msg.sender], _nonces[msg.sender]));
        require(_balanceCommitments[msg.sender] == expectedCommitment, "Invalid commitment");

        _encryptedBalances[msg.sender] -= amount;
        _nonces[msg.sender] = nonce;
        _balanceCommitments[msg.sender] = keccak256(abi.encodePacked(_encryptedBalances[msg.sender], nonce));

        _mint(msg.sender, amount);

        emit Withdrawal(msg.sender, amount, nonce);
    }



    /**
     * @dev Verify a balance commitment
     */
    function verifyBalanceCommitment(
        address account,
        uint256 balance,
        uint256 nonce
    ) external view returns (bool) {
        bytes32 commitment = keccak256(abi.encodePacked(balance, nonce));
        return _balanceCommitments[account] == commitment;
    }
}
