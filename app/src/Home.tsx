import type { FC } from 'react';

import type { ENSIPData } from '.';
import { Navbar } from './components/Navbar';
import { Frame } from './Frame';

export const Home: FC<{ ensips: ENSIPData[] }> = ({ ensips }) => {
    return (
        <Frame>
            <article>
                <Navbar />
                <h1>ENSIPs</h1>
                <ul className="ensip-list">
                    {ensips.map(({ path, title }) => (
                        <li
                            key={path}
                            data-X={title.toLowerCase().startsWith('ensip-x')}
                        >
                            <a href={`/${path}`} className="link">
                                {title}
                            </a>
                        </li>
                    ))}
                </ul>
            </article>
        </Frame>
    );
};
