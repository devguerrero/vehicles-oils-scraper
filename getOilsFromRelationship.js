// Modules
const fs = require("fs");
const readline = require("readline");
// Variables
const dir = "output";
const csvRegexp = /.*\.csv/;
const oils = new Set();
const oilIndexInCSV = 4;

// Main execution
(async () => {
  try {
    const filesInDir = await fs.promises.readdir(dir);
    const csvFiles = filesInDir.filter((file) => csvRegexp.test(file));

    await Promise.all(
      csvFiles.map(async (file) => {
        const filePath = `${dir}/${file}`;
        const readlineOptions = {
          input: fs.createReadStream(filePath),
          crlfDelay: Infinity,
        };

        const readlineStream = readline.createInterface(readlineOptions);
        console.log(`reading ${file}`);
        for await (const line of readlineStream) {
          const lineSplitted = line.split(",");
          oils.add(lineSplitted[oilIndexInCSV].trim());
        }
      })
    );

    const oilsArray = Array.from(oils);
    await Promise.all(
      oilsArray.map((oil) => {
        fs.promises.writeFile(`${dir}/oils.txt`, `${oil}\n`, {
          flag: "a",
        });
      })
    );
  } catch (err) {
    console.error("Ups! Ocurrio un error. ", err);
  }
})();
