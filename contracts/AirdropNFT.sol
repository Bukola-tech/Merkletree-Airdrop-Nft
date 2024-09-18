// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";


contract MerkleDistributor {
  
    error InvalidAddress();
    error RewardsAlreadyClaimed();
    error UnauthorizedAccess();
    error InvalidProof();
    error InvalidAmount();
    error ExcessUnclaimedTokens();
    error NotNFTOwner();
    error NoNFTBalance();


    event AirdropClaimed(address indexed beneficiary, uint256 indexed amount);
    event WithdrawalSuccess(address indexed executor, uint256 indexed amount);

    // @dev state variables
    address admin;
    address public immutable tokenContract;
    bytes32 public merkleRootHash;
    address public immutable baycNFT;
    uint256 totalDistributedAmount;

    // @dev mapping to track users that have claimed
    mapping(address => bool) hasClaimed;

      address public nftContractAddress;

    constructor(address _tokenContract, bytes32 _merkleRootHash, address _nftContractAddress) {
        tokenContract = _tokenContract;
        merkleRootHash = _merkleRootHash;
        admin = msg.sender;
        baycNFT = _nftContractAddress;
    }

    // @dev prevents zero address from interacting with the contract
    function validateAddress(address _address) private pure {
        if (_address == address(0)) {
            revert InvalidAddress();
        }
    }

    function validateAmount(uint256 _amount) private pure {
        if (_amount == 0) {
            revert InvalidAmount();
        }
    }

    // @dev prevents unauthorized users from accessing admin privileges
    function onlyAdmin() private view {
        if (msg.sender != admin) {
            revert UnauthorizedAccess();
        }
    }

    // @dev returns if a user has claimed or not
    function hasUserClaimed() private view returns (bool) {
        validateAddress(msg.sender);
        return hasClaimed[msg.sender];
    }

    // @dev checks contract token balance
    function getTokenBalance() public view returns (uint256) {
        onlyAdmin();
        return IERC20(tokenContract).balanceOf(address(this));
    }

    // @user for claiming airdrop
      function claimTokens(
        uint256 _amount, 
        bytes32[] calldata _merkleProof) external {
        validateAddress(msg.sender);
        if (hasClaimed[msg.sender]) {
            revert RewardsAlreadyClaimed();
        }
        if (IERC721(baycNFT).balanceOf(msg.sender) == 0) {
            revert NoNFTBalance();
        }

        // @dev hash the encoded byte form of the user address and amount to create a leaf
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, _amount));

        // @dev check if the merkleProof provided is valid or belongs to the merkleRoot
        if (!MerkleProof.verify(_merkleProof, merkleRootHash, leaf)) {
            revert InvalidProof();
        }

        hasClaimed[msg.sender] = true;
        totalDistributedAmount += _amount;

        require(IERC20(tokenContract).transfer(msg.sender, _amount), "Transfer failed");

        emit AirdropClaimed(msg.sender, _amount);
    }

    // @user for the contract admin to update the Merkle root
    // @dev updates the merkle state
    function setMerkleRoot(bytes32 _merkleRootHash) external {
        onlyAdmin();
        merkleRootHash = _merkleRootHash;
    }

    // @user get current merkle proof
    function getCurrentMerkleRoot() external view returns (bytes32) {
        validateAddress(msg.sender);
        onlyAdmin();
        return merkleRootHash;
    }

    // @user For admin to withdraw leftover tokens

    /* @dev the withdrawal is only possible if the amount of tokens left in the contract
        is less than the total amount of tokens claimed by the users
    */
    function withdrawRemainingTokens() external {
        onlyAdmin();
        uint256 currentBalance = getTokenBalance();
        validateAmount(currentBalance);

        if (totalDistributedAmount <= currentBalance) {
            revert ExcessUnclaimedTokens();
        }
        /* if the totalDistributedAmount is greater than the contract balance
        it is safe to withdraw because at least 51% of the token would have been circulated
        */
        IERC20(tokenContract).transfer(admin, currentBalance);
    }
}


//https://etherscan.io/token/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d