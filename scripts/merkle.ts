import csvpaser from "csv-parser";
import fs from "fs";
import { MerkleTree } from "merkletreejs";
import { ethers } from "hardhat";
import keccak256 from "keccak256";




const csvFilePath = "csv/merkle.csv";
let leafData: any [] = [];

const datahash = (data: object): Buffer => keccak256(JSON.stringify(data));

// reading from the file into the array
fs.createReadStream(csvFilePath)

.pipe(csvpaser())

.on("data",  (row:  {address:string; amount: number}) => {

    leafData.push(row);

})
.on ("end", () => {
    const dataleaves = leafData.map ((data) => datahash(data))

    const merkleTree = new MerkleTree(dataleaves, datahash, {
        sortPairs: true,
    });

    const leafRootHash = merkleTree.getHexRoot();
    console.log("Merkle Root:", leafRootHash);

    // Extracting proof for this address
    const dataleavestarget = {
        address: "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
        amount:'105'
    }
    const eachdataleaf = datahash(dataleavestarget)

    // Create leaf for proof

    const proof = merkleTree.getHexProof(eachdataleaf);
    console.log("Proof:", proof);

    // verify the proof
    const isValid = merkleTree.verify(proof, eachdataleaf, leafRootHash);
      console.log("Proof is valid:", isValid);
    


}//Merkle Root: 0x7391b396eee846e0d15863dd134a4a6980e23e5957a8fe9f0034890ddf581526
// Proof: [
//     '0x1589c23c73eeeb2d6ad51b044ef309a3af5b48a9a87bbd48632113227a339cc8',
//     '0x68b796cef58ebc376e0d425522a2062c85cdb42113c406f5c6dfcbfe90c97bf6',
//     '0x62e48f4de40cbd8d0c33bc8c00f1f4018a675465fb86bb609d43756ec8d95fdf',
//     '0xb25d410bef5113170f9d9917ad80317812261baa525ae4e1d094df28bf91caad'
//   ]
//   Proof is valid: true
)


