import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import csv from "csv-parser";
import fs from "fs";

const filePath = "csv/merkle.csv";
const leafData: [string, string][] = [];

fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row: { address: string; amount: string }) => {
        const claimData: [string, string] = [row.address, row.amount];
        leafData.push(claimData);
    })
    .on("end", () => {
        try {
            const merkleTree = StandardMerkleTree.of(leafData, ["address", "uint256"]);
            console.log("Merkle Root:", merkleTree.root);

            const proofs: { [key: string]: string[] } = {};

            for (const [i, v] of merkleTree.entries()) {
                const proof = merkleTree.getProof(i);
                proofs[v[0]] = proof;

                if (i == 3) {
                    console.log(proof);
                }
            }

            console.log("Proofs saved");
        } catch (err) {
            console.log("Proofs not generated: " + err);
        }
    })
    .on("error", (err: Error) => {
        console.log("Error reading merkle.csv: " + err);
    });