import autoprefixer from 'autoprefixer';
import postcssNested from 'postcss-nested';
import tailwind from 'tailwindcss';

export default {
    plugins: [
        tailwind(),
        postcssNested(),
        autoprefixer({
            overrideBrowserslist: [
                'last 4 versions',
                '> 1%',
                'Firefox ESR',
                'ie 11',
            ],
        }),
    ],
};
