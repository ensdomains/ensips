import type { FC } from 'react';

import type { Frontmatter } from '../specs/validateFrontmatter';

export const Header: FC<{ frontmatter: Frontmatter }> = ({ frontmatter }) => {
    return (
        <header className="front space-y-4">
            <div>
                <b>Description</b>
                <div>{frontmatter.description}</div>
            </div>
            <div>
                <b>Status</b>
                <div>{frontmatter.ensip.status}</div>
            </div>
            <div>
                <b>Created</b>
                <div>
                    {new Date(frontmatter.ensip.created).toLocaleDateString()}
                </div>
            </div>
            <div>
                <b>
                    Author
                    {frontmatter.contributors.length > 1 ? 's' : ''}
                </b>
                <ul>
                    {frontmatter.contributors.map((contributor, index) => {
                        return <li key={index}>{contributor}</li>;
                    })}
                </ul>
            </div>
        </header>
    );
};
