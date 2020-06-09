// Modules
const fs = require("fs");
const readline = require("readline");
// Variables
const dir = "output";
const csvRegexp = /\d{4}.*\.csv/;
const ultralubOilsMap = new Map();

// Create ultralub Oils mapping
const uniqueOils = [
  "0W-20",
  "0W-40",
  "0W-30",
  "5W-20",
  "5W-30",
  "5W-40",
  "5W-50",
  "10W-30",
  "10W-40",
  "10W-50",
  "10W-60",
  "15W-20",
  "15W-40",
  "15W-50",
  "20W-20",
  "20W-40",
  "20W-50",
];

uniqueOils.map((oil) => {
  ultralubOilsMap.set(oil, new Set());
});

// Main execution
(async () => {
  try {
    const filesInDir = await fs.promises.readdir(dir);
    const csvFiles = filesInDir.filter((file) => csvRegexp.test(file));
    const oilIndexInCSV = 4;
    const engineIndexInCSV = 3;
    const viscosityRegexp = /\d{1,2}W\-\d{1,2}/g;

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
          const engine = lineSplitted[engineIndexInCSV].trim();
          const product = lineSplitted[oilIndexInCSV].trim();
          const oilArray = product.match(viscosityRegexp);
          if (oilArray instanceof Array && oilArray.length) {
            const ultralubOil = oilArray[0];
            ultralubOilsMap.get(ultralubOil).add(engine);
          }
        }
      })
    );

    const filePath = `${dir}/oils_engine_relationship.csv`;
    fs.promises.writeFile(filePath, `title, motor\n`);
    const ultralubOilsArray = Array.from(ultralubOilsMap.keys());

    for (const oil of ultralubOilsArray) {
      const enginesArray = Array.from(ultralubOilsMap.get(oil));
      await fs.promises.writeFile(
        filePath,
        `${oil},"${enginesArray.toString()}"\n`,
        {
          flag: "a",
        }
      );
    }
  } catch (err) {
    console.error("Ups! Ocurrio un error. ", err);
  }
})();
