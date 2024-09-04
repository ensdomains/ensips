import type { FC } from 'react';

import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { Frame } from './Frame';
import type { Frontmatter } from './specs/validateFrontmatter';

export const App: FC<{ markdown: string; frontmatter: Frontmatter }> = ({
    markdown,
    frontmatter,
}) => {
    return (
        <Frame>
            <article>
                <Navbar />
                <Header frontmatter={frontmatter} />
                <div dangerouslySetInnerHTML={{ __html: markdown }} />
                <div>ENSIPs</div>
            </article>
        </Frame>
    );
};
