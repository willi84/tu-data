// src/index.ts
import { parse } from 'node-html-parser';
import fs from 'node:fs/promises';
import { getSheetData } from './google/google';
import { SHEET_ID, SHEET_TAB } from './check.config';

type Status = 'current' | 'completed' | 'unknown';

type Source = {
  url: string;
  institution: string;
  status: Status;
};

type Project = {
  name: string;
  description: string;
  image?: string;
  url: string;
  institution: string;
  status: Status;
};

const sources: Source[] = [
  {
    url: 'https://www.tu.berlin/geoinformation/forschung/projekte/laufende-projekte/',
    institution: 'Geoinformation in der Umweltplanung',
    status: 'current',
  },
  {
    url: 'https://www.tu.berlin/geoinformation/forschung/projekte/abgeschlossene-projekte',
    institution: 'Geoinformation in der Umweltplanung',
    status: 'completed',
  },
  {
    url: 'https://www.tu.berlin/landschaft/forschung/projekte/laufende-projekte',
    institution: 'Institut für Landschaftsarchitektur und Umweltplanung',
    status: 'current',
  },
  {
    url: 'https://www.tu.berlin/ztg/forschung/projekte/laufende-projekte',
    institution: 'Zentrum Technik und Gesellschaft',
    status: 'current',
  },
  {
    url: 'https://www.tu.berlin/ztg/forschung/projekte/abgeschlossene-projekte',
    institution: 'Zentrum Technik und Gesellschaft',
    status: 'completed',
  },
  {
    url: 'https://www.tu.berlin/eim/forschung-projekte/projekte',
    institution: 'Entrepreneurship und Innovationsmanagement',
    status: 'current',
  },
];

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function absoluteUrl(value: string | undefined, baseUrl: string): string | undefined {
  if (!value) return undefined;

  try {
    return new URL(value, baseUrl).href;
  } catch {
    return undefined;
  }
}

async function crawlSource(source: Source): Promise<Project[]> {
  const response = await fetch(source.url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${source.url}: ${response.status}`);
  }

  const html = await response.text();
  const root = parse(html);

  const projects: Project[] = [];

  // TU-Seiten sind oft in Content-Blöcken / Frames strukturiert
  const blocks = root.querySelectorAll('article, section, .frame, .ce-textpic, .ce-bodytext');

  for (const block of blocks) {
    const title = clean(
      block.querySelector('h2, h3, h4')?.textContent ?? '',
    );

    if (!title || title.length < 3) continue;

    const paragraphs = block
      .querySelectorAll('p')
      .map((p) => clean(p.textContent))
      .filter(Boolean);

    const description = paragraphs.join(' ').slice(0, 700);

    if (!description) continue;

    const imageRaw =
      block.querySelector('img')?.getAttribute('src') ??
      block.querySelector('img')?.getAttribute('data-src');

    projects.push({
      name: title,
      description,
      image: absoluteUrl(imageRaw, source.url),
      url: source.url,
      institution: source.institution,
      status: source.status,
    });
  }

  return projects;
}

const proceedSheetData =  (sheetJson: any) => {
    const all: Project[] = [];
    for(const item of sheetJson.table.rows) {
        const data = item.c
        const dataSet = {};
        let i = 0;
        for(const row of sheetJson.table.cols) {
            // dataSet[row.label] = row.context;

            console.log(row.label)
            console.log(data[i].v);
            const key = row.label.toLowerCase() as keyof Project;
            if(key.indexOf('zeitstempel') > -1) {
                dataSet['lastUpdated'] = data[i].v;
            } else if(key.indexOf('goal') > -1) {
                dataSet['goals'] = data[i].v;
            } else {
                dataSet[key] = data[i].v;
            }
            i++;
        }
        all.push(dataSet as Project);
    }
    return all;

}

async function main() {
  const all: Project[] = [];
  



  const sheetJson = await getSheetData(SHEET_ID, SHEET_TAB);
  all.push(...proceedSheetData(sheetJson));

  for (const source of sources) {
    console.log(`crawl: ${source.url}`);
    all.push(...await crawlSource(source));
  }
  const finalData = {
    data: all,
    lastUpdated: new Date().toISOString(),
    '$schema': './projects.schema.json',
  }

  // copy projects.schmea
  await fs.copyFile('projects.schema.json', 'output/projects.schema.json');


  await fs.mkdir('output', { recursive: true });
  await fs.writeFile(
    'output/projects.json',
    JSON.stringify(finalData, null, 2),
    'utf-8',
  );

  console.log(`done: ${all.length} projects`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});