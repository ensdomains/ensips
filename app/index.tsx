import { renderToStaticMarkup } from 'react-dom/server';
import { App } from './src/App';
import { readFile, mkdir, writeFile, readdir, rm } from 'fs/promises';
import { remark } from 'remark';
import html from 'remark-html';
import remarkFrontMatter from 'remark-frontmatter';
import { parse as parseYaml, YAMLParseError } from 'yaml';

export type Frontmatter = {
    description: string;
    contributors: string[];
    ensip: {
        status: string;
        created: string;
    }
}

console.log('Building preview...');

let markdown_files = await readdir('../ensips');
const files = markdown_files.map(x => `../ensips/${x}`);

// delete the dist folder
try {
    await rm('./dist', { recursive: true })
} catch (e) {
    // Soft error if directory doesn't exist
    // console.log(e);
}

await mkdir('./dist');

for (const file of files) {
    try {
        const fileData = await readFile(file, 'utf8');

        let frontmatter: string = '';

        const result = await remark().use(remarkFrontMatter).use(html).use(function () {
            return function (tree) {
                // console.dir(tree)
                let first = ((tree as any)['children'] as { type: string, value?: string }[]).shift();
                if (first && first.type === 'yaml' && first.value) {
                    frontmatter = first.value;
                } else {
                    throw new Error('No frontmatter found');
                }
            }
        }).process(fileData);

        const frontmatter_parsed = parseYaml(frontmatter) as Frontmatter;
        console.log(frontmatter_parsed);

        const x = renderToStaticMarkup(<App markdown={result.value.toString()} frontmatter={frontmatter_parsed} />);

        // write to file
        await writeFile(`./dist/${file.split('/').pop()?.replace('.md', '.html')}`, x);
    } catch (error) {
        const directPath = file.replace('../', '/app/');

        if (error instanceof YAMLParseError) {
            console.log(error.linePos);
            // console.log('::error file=' + directPath + ',line=' + error.mark.line + ',col=' + error.mark.column + ',endColumn=' + error.mark.column + '::Unable to load file')
        }

        console.log(error);
        console.log('::error file=' + directPath + ',line=1,col=1,endColumn=2::Unable to load file')
    }
}

const static_files = ['./public/index.css'];

for (const file of static_files) {
    const fileData = await readFile(file, 'utf8');

    // write to file
    await writeFile(`./dist/${file.split('/').pop()}`, fileData);
}

console.log('Preview built successfully!');
