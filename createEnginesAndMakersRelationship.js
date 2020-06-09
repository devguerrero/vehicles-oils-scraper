// Modules
const fs = require("fs");
const readline = require("readline");
// Variables
const dir = "output";
const csvRegexp = /\d{4}.*\.csv/;
const enginesToModelsMap = new Map();
const enginesToYearsMap = new Map();
const makersToModelsMap = new Map();

// Main execution
(async () => {
  try {
    const filesInDir = await fs.promises.readdir(dir);
    const csvFiles = filesInDir.filter((file) => csvRegexp.test(file));
    const yearIndexInCSV = 0;
    const makerIndexInCSV = 1;
    const modelIndexInCSV = 2;
    const engineIndexInCSV = 3;

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
          const maker = lineSplitted[makerIndexInCSV].trim();
          const model = lineSplitted[modelIndexInCSV].trim();
          const year = lineSplitted[yearIndexInCSV].trim();

          addToRelationshipMap(enginesToModelsMap, engine, model);
          addToRelationshipMap(enginesToYearsMap, engine, year);
          addToRelationshipMap(makersToModelsMap, maker, model);
        }
      })
    );

    //console.log(makersToModelsMap);
    const makerToModelsFilePath = `${dir}/maker_models_relationship.csv`;
    const engineToModesAndYearsFilePath = `${dir}/engine_models_years_relationship.csv`;

    await fs.promises.writeFile(makerToModelsFilePath, `marke, title\n`);
    await fs.promises.writeFile(
      engineToModesAndYearsFilePath,
      `title, model, year\n`
    );

    const enginesArray = Array.from(enginesToModelsMap.keys());
    const makersArray = Array.from(makersToModelsMap.keys());

    for (const engine of enginesArray) {
      const modelsArray = Array.from(enginesToModelsMap.get(engine));
      const yearsArray = Array.from(enginesToYearsMap.get(engine));

      await fs.promises.writeFile(
        engineToModesAndYearsFilePath,
        `${engine}, "${modelsArray.toString()}", "${yearsArray.toString()}"\n`,
        {
          flag: "a",
        }
      );
    }

    for (const maker of makersArray) {
      const modelsArray = Array.from(makersToModelsMap.get(maker));
      for (const model of modelsArray) {
        await fs.promises.writeFile(
          makerToModelsFilePath,
          `${maker}, ${model}\n`,
          {
            flag: "a",
          }
        );
      }
    }
  } catch (err) {
    console.error("Ups! Ocurrio un error. ", err);
  }
})();

function addToRelationshipMap(relationshipMap, oneEntity, manyEntity) {
  if (relationshipMap.has(oneEntity)) {
    relationshipMap.get(oneEntity).add(manyEntity);
  } else {
    relationshipMap.set(oneEntity, new Set([manyEntity]));
  }
}
