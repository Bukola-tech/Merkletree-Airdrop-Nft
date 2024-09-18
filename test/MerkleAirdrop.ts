import {
  loadFixture,
  setBalance,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

describe("MerkleDistributor", function () {
  async function deployERC20() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const ERC20 = await ethers.getContractFactory("Token");
    const token = await ERC20.deploy();
    return{token};
  }

  async function deployAirdrop() {
    const [owner, Acc1, Acc2] = await ethers.getSigners();

    const merkleRootHash = "0xb0643b41431092149c186135faee23ff4709260e091e8493cbea55656276959e";
    // const merkleRootHash = "0x9f961e5d27845557de9414fd8eef3c3d1cae2234679c1c308bc929c3a9279e75";
    const { token } = await loadFixture(deployERC20);

    const NFT = await ethers.getContractFactory("MerkleDistributor");
    const nft = await NFT.deploy(token, merkleRootHash);
    await token.transfer(nft, ethers.parseUnits("10000", 18))

    const nftHolderAddy = "0x98E711f31E49C2e50C1A290b6F2b1e493E43EA76"
    const impersonatedAddy = await ethers.getImpersonatedSigner(nftHolderAddy)

    const proof = [
    //   '0x6cb0a5b84246566db34be4ba40a2edea52daf7c813991e066dd9a6bc4630bdc0',
    //   '0xbde0d9d35f3068fda51a2f74f91363a61565bdf8fa873c93f70cfd15ad29774c',
    //   '0x2374aeb5ed569f700ac78ee401405c3279a87af3c43b612a40048dc56db98a29'
    // ]
      '0x3b6db8745c616747d31432d738f62e9411f5ef3efdb739cfa281187f32f8f942',
      '0x806bee5701af3b925fb8870ceb70bdd58f8911775934079313fd5b2e3e65be90'
    ]

    return {token, nft, owner, Acc1, Acc2, proof, impersonatedAddy}
  }

  describe("Deployment", function () {
    it("should deploy the contracts correctly", async function () {
      const { token, nft, owner } = await loadFixture(deployAirdrop);

      expect(await token.owner()).to.equal(owner);
      expect(await nft.tokenContract()).to.equal(token);
      expect(await nft.merkleRootHash()).to.equal("0xb0643b41431092149c186135faee23ff4709260e091e8493cbea55656276959e");
    });    
  })
  
  describe("claimTokens", function () {
    it("should give airdrop to eligible address", async function () {
      const {nft, impersonatedAddy, proof, token}  = await loadFixture(deployAirdrop);
      
      await setBalance(impersonatedAddy.address, ethers.parseEther("1"))
      await nft.connect(impersonatedAddy).claimTokens("500", proof)
      const balance = await token.balanceOf(impersonatedAddy)
      const totalBal = balance + BigInt(500)

      expect(await token.balanceOf(impersonatedAddy)).to.equal(500)
    })

    it("should not give user with wrong proof", async function () {
      const {nft, impersonatedAddy}  = await loadFixture(deployAirdrop);
      
      const wrongProof = [
        '0x6cb0a5b84246566db34be4ba40a2edea52daf7c813991e066dd9a6bc4630aef2',
        '0xbde0d9d35f3068fda51a2f74f91363a61565bdf8fa873c93f70cfd15ad297776',
        '0x2374aeb5ed569f700ac78ee401405c3279a87af3c43b612a40048dc56db98a28'
      ]

      await setBalance(impersonatedAddy.address, ethers.parseEther("1"));
      await expect(nft.connect(impersonatedAddy).claimTokens("500", wrongProof)).to.revertedWithCustomError(nft,"InvalidProof")

    })

    //repeat claim twice
    it("Should revert if user has claimed", async function () {
      const {nft, impersonatedAddy, proof, token}  = await loadFixture(deployAirdrop);
      
      await setBalance(impersonatedAddy.address, ethers.parseEther("1"))
      await nft.connect(impersonatedAddy).claimTokens("500", proof)
      await expect(nft.connect(impersonatedAddy).claimTokens("500", proof)
    ).to.be.revertedWithCustomError(nft, "RewardsAlreadyClaimed");
      
      expect(await token.balanceOf(impersonatedAddy)).to.equal(500)
    });
  });
});
