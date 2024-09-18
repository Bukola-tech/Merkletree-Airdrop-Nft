import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";


describe("MerkleDistributor", function () {
  async function deployFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Use the actual BAYC NFT address
    const baycNFTAddress = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D";

    // Use the actual ERC20 token address (e.g., USDC)
    const tokenAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

    // Impersonate USDC whale account to get tokens
    const usdcWhaleAddress = "0x55FE002aefF02F77364de339a1292923A15844B8";
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [usdcWhaleAddress],
    });
    const usdcWhale = await ethers.getSigner(usdcWhaleAddress);

    const Token = await ethers.getContractFactory("IERC20");
    const token = Token.attach(tokenAddress);

    const NFT = await ethers.getContractFactory("IERC721");
    const nft = NFT.attach(baycNFTAddress);

    const leaves = [addr1, addr2].map(addr => 
      ethers.utils.solidityKeccak256(["address", "uint256"], [addr.address, ethers.utils.parseEther("100")])
    );
    const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const rootHash = merkleTree.getHexRoot();

    const MerkleDistributor = await ethers.getContractFactory("MerkleDistributor");
    const merkleDistributor = await MerkleDistributor.deploy(tokenAddress, rootHash, baycNFTAddress);

    // Transfer tokens to MerkleDistributor
    await token.connect(usdcWhale).transfer(merkleDistributor.address, ethers.utils.parseUnits("1000", 6));

    // Transfer BAYC NFTs to addr1 and addr2 (this is a simplified version, as transferring actual BAYC tokens would be complex)
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [await nft.ownerOf(1)],
    });
    const nftOwner = await ethers.getSigner(await nft.ownerOf(1));
    await nft.connect(nftOwner).transferFrom(nftOwner.address, addr1.address, 1);
    await nft.connect(nftOwner).transferFrom(nftOwner.address, addr2.address, 2);

    return { merkleDistributor, token, nft, owner, addr1, addr2, merkleTree, rootHash };
  }

  it("Should allow eligible users to claim tokens", async function () {
    const { merkleDistributor, token, addr1, merkleTree } = await deployFixture();

    const proof = merkleTree.getHexProof(ethers.utils.solidityKeccak256(
      ["address", "uint256"], 
      [addr1.address, ethers.utils.parseEther("100")]
    ));

    await expect(merkleDistributor.connect(addr1).claimTokens(ethers.utils.parseUnits("100", 6), proof))
      .to.emit(merkleDistributor, "AirdropClaimed")
      .withArgs(addr1.address, ethers.utils.parseUnits("100", 6));

    expect(await token.balanceOf(addr1.address)).to.equal(ethers.utils.parseUnits("100", 6));
  });

  it("Should not allow non-NFT holders to claim", async function () {
    const { merkleDistributor, owner, merkleTree } = await deployFixture();

    const proof = merkleTree.getHexProof(ethers.utils.solidityKeccak256(
      ["address", "uint256"], 
      [owner.address, ethers.utils.parseEther("100")]
    ));

    await expect(merkleDistributor.claimTokens(ethers.utils.parseUnits("100", 6), proof))
      .to.be.revertedWith("NoNFTBalance");
  });

  it("Should allow admin to update merkle root", async function () {
    const { merkleDistributor } = await deployFixture();

    const newRootHash = ethers.utils.randomBytes(32);
    await merkleDistributor.setMerkleRoot(newRootHash);
    expect(await merkleDistributor.getCurrentMerkleRoot()).to.equal(ethers.utils.hexlify(newRootHash));
  });

  // Add more tests for other functions and edge cases
});
