const puppeteer = require("puppeteer");
const fs = require("fs");
const PAGE_TO_SCRAP = "";
const FILES_PATH = "output/";

let keepExecution = true;
(async () => {
  while (keepExecution) {
    delete require.cache[require.resolve("./memoization.json")];
    let memoizedOptions = require("./memoization.json");
    console.log(memoizedOptions);
    try {
      await run(memoizedOptions);
      keepExecution = false;
    } catch (err) {
      console.log(err);
    }
  }
})();

async function run(options) {
  const browser = await puppeteer.launch({
    // headless: false,
    args: ["--no-sandbox"],
    defaultViewport: {
      width: 1280,
      height: 720,
    },
  });
  const page = await browser.newPage();
  const timeout = 30000;
  page.setDefaultNavigationTimeout(timeout);
  page.setDefaultTimeout(timeout);
  await page.goto(PAGE_TO_SCRAP);
  const selects = [
    "select#select0",
    "select#select1",
    "select#select2",
    "select#select3",
    "select#select4",
  ];

  const initialOptions = options.length
    ? options.map((option) => option.index)
    : [22, 2, 2, 2];
  options = [];
  let currentDate = new Date();
  currentDate = currentDate.toISOString().split(".")[0];
  const oilsFile = `${FILES_PATH}oils_related_to_engines_model_maker_year`;
  await loopDependentSelectsRecursive(
    selects,
    initialOptions,
    oilsFile,
    page,
    0,
    options
  );
}

async function loopDependentSelectsRecursive(
  cssSelectors,
  initialOptionsIndex,
  fileName,
  page,
  selectedIndex = 0,
  memo = []
) {
  const selector = cssSelectors[selectedIndex];
  const initalOption = initialOptionsIndex.shift() || 2;
  const selectOptions = await page.$$(`${selector} option`);
  const selectOptionsCount = selectOptions.length;
  const memoFile = "./memoization.json";

  for (let i = initalOption; i <= selectOptionsCount; i++) {
    const name = await selectNthOption(selector, i, page);

    memo.push({ index: i, name: name.trim() });
    await fs.promises.writeFile(memoFile, JSON.stringify(memo));

    if (selectedIndex < cssSelectors.length - 2) {
      await page.waitForSelector(
        `${cssSelectors[selectedIndex + 1]}:not([disabled])`
      );
      await loopDependentSelectsRecursive(
        cssSelectors,
        initialOptionsIndex,
        fileName,
        page,
        selectedIndex + 1,
        memo
      );
    }

    if (selectedIndex === cssSelectors.length - 2) {
      try {
        await page.waitForSelector(
          `${cssSelectors[selectedIndex + 1]}:not([disabled])`,
          { timeout: 3000 }
        );
        await selectNthOption(cssSelectors[selectedIndex + 1], 3, page);
      } catch (err) {
        console.log("No se encontró ", cssSelectors[selectedIndex + 1]);
      }

      const button = ".wmi-button .btn:not([disabled])";
      await page.waitForSelector(button);
      await page.click(button);
      const text = memo.reduce((prev, option) => `${prev}${option.name},`, "");
      let fileArray = fileName.split("/");
      fileArrayLength = fileArray.length - 1;
      fileArray[
        fileArrayLength
      ] = `${memo[0].name}_${fileArray[fileArrayLength]}`;
      await getOils(page, text, fileArray.join("/"));
      await page.goBack();
      for (const i in memo) {
        await page.waitForSelector(`${cssSelectors[i]}:not([disabled])`);
        await selectNthOption(cssSelectors[i], memo[i].index, page);
      }
    }

    memo.pop();
  }
}

async function selectNthOption(selector, nthOption, page) {
  return await page.evaluate(
    (selector, nthOption) => {
      const option = document.querySelector(
        `${selector} > option:nth-child(${nthOption})`
      );
      option.selected = true;
      const select = document.querySelector(selector);
      let event = new Event("change", { bubbles: true });
      event.simulated = true;
      select.dispatchEvent(event);
      return Promise.resolve(option.textContent);
    },
    selector,
    nthOption
  );
}

async function getOils(page, text = "", fileToWrite) {
  const descriptionSelector = ".recommendations-header .header-description p";
  const oilsCssSelector = ".result-list .result-list-title";
  await page.waitForSelector(descriptionSelector);
  try {
    await page.waitForSelector(oilsCssSelector);
  } catch (err) {
    console.log(
      "No hay headings de aceites para este motor, pero continua la ejecución"
    );
  }

  const oilNames = await page.evaluate(
    (headingsSelector, descriptionSelector) => {
      const viscosityRegexp = /\d{1,2}W\-\d{1,2}/g;
      const $description = document.querySelector(`${descriptionSelector}`);
      const $headings = document.querySelectorAll(`${headingsSelector}`);
      const oils = $description.textContent.match(viscosityRegexp);
      $headings.forEach((el) => oils.push(el.textContent));
      return Promise.resolve(oils);
    },
    oilsCssSelector,
    descriptionSelector
  );

  console.log(oilNames.map((oil) => `${text}${oil}\n`));

  Promise.all(
    oilNames.map((oil) =>
      fs.promises.writeFile(fileToWrite, `${text}${oil}\n`, { flag: "a" })
    )
  );
}
// "Asociación de motor con Modelo y Año";
// "motor title, model title, year";
//
// "Asociación de Fabricante de vehículos con Modelos";
// "maker name, model title";
//
// "Asociación de motor con aceites";
// "engine name, oils name";
