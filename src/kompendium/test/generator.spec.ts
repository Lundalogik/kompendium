import tmp from 'tmp';
import fs from 'fs';
import { kompendiumGenerator } from '../generator';
import { Config } from '@stencil/core/internal';

describe('kompendium()', () => {
    let path: string;
    let tmpObject: any;
    let kompendium;
    let stencilConfig: Config;

    beforeEach(() => {
        tmpObject = tmp.dirSync({ unsafeCleanup: true });
        path = tmpObject.name;
        kompendium = kompendiumGenerator({
            path: path,
            publicPath: `${path}/public`,
        });
        stencilConfig = {
            logger: {
                createTimeSpan: () => ({
                    finish: () => null,
                    duration: () => null,
                }),
                debug: () => null,
                warn: () => null,
            } as any,
        };
    });

    afterEach(() => {
        tmpObject.removeCallback();
    });

    it('should write the kompendium.json file to the configured path', async () => {
        await kompendium({}, stencilConfig);
        expect(fs.existsSync(`${path}/kompendium.json`)).toBeTruthy();
    });

    it('should write the JSON data to the kompendium.json file', async () => {
        await kompendium({ foo: 'bar' }, stencilConfig);
        const json = fs.readFileSync(`${path}/kompendium.json`, 'utf8');
        const data = JSON.parse(json);
        expect(typeof data).toEqual('object');
        expect(data.docs).toEqual({ foo: 'bar', components: [] });
    });
});

describe('kompendiumGenerator() when the public folder has a kompendium.json from an earlier run', () => {
    let tmpObject: any;
    let path: string;
    let publicPath: string;
    let dataFile: string;
    let oldFile: string;

    const isStillThere = (file: string) => {
        try {
            fs.lstatSync(file);

            return true;
        } catch {
            return false;
        }
    };

    const createGenerator = () =>
        kompendiumGenerator({ path: path, publicPath: publicPath });

    beforeEach(() => {
        tmpObject = tmp.dirSync({ unsafeCleanup: true });
        path = `${tmpObject.name}/data`;
        publicPath = `${tmpObject.name}/public`;
        fs.mkdirSync(path);
        fs.mkdirSync(publicPath);
        dataFile = `${path}/kompendium.json`;
        oldFile = `${publicPath}/kompendium.json`;
    });

    afterEach(() => {
        tmpObject.removeCallback();
    });

    it('removes an old copy of the file as soon as the generator is created', () => {
        fs.writeFileSync(oldFile, 'old');

        createGenerator();

        expect(isStillThere(oldFile)).toBe(false);
    });

    it('removes an old link, but not the file it points to', () => {
        fs.writeFileSync(dataFile, 'data');
        fs.symlinkSync(dataFile, oldFile);

        createGenerator();

        expect(isStillThere(oldFile)).toBe(false);
        expect(fs.readFileSync(dataFile, 'utf8')).toBe('data');
    });

    it('removes an old link that points to nothing', () => {
        fs.symlinkSync(`${path}/missing.json`, oldFile);

        createGenerator();

        expect(isStillThere(oldFile)).toBe(false);
    });

    it('leaves the other files in the public folder alone', () => {
        fs.writeFileSync(`${publicPath}/index.html`, '<html></html>');
        fs.writeFileSync(oldFile, 'old');

        createGenerator();

        expect(isStillThere(`${publicPath}/index.html`)).toBe(true);
    });

    it('does nothing when there is no old file', () => {
        expect(createGenerator).not.toThrow();
    });
});
