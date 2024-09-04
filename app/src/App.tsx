import type { FC } from 'react';

import type { ENSIPData } from '.';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { Frame } from './Frame';

export const App: FC<{ data: ENSIPData }> = ({ data }) => {
    const { path, title, frontmatter, markdown } = data;

    return (
        <Frame>
            <article>
                <Navbar />
                <Header frontmatter={frontmatter} />
                <h1>{title}</h1>
                <div dangerouslySetInnerHTML={{ __html: markdown }} />
            </article>
        </Frame>
    );
};
