const { spawn } = require("child_process");

async function verify(contractNames, network) {
  let target;
  if (["mainnet", "rinkeby", "kovan", "ropsten", "goerli"].includes(network)) {
    target = "etherscan";
  } else if (["xdai", "sokol"].includes(network)) {
    target = "blockscout";
  } else {
    return;
  }
  return new Promise((resolve, reject) => {
    console.log(`Verifying ${contractNames.length} contracts on ${target}...`);
    const cmd = `truffle run ${target} ${contractNames.join(" ")} --network ${network} --license UNLICENSED`;
    const p = spawn("npx", cmd.split(" "), {
      stdio: "inherit",
    });
    console.log(`npx ${cmd}`);
    p.on("exit", (code) => resolve(code));
    p.on("error", (code) => reject(code));
  });
}

module.exports = { verify };
