const fs = require('fs').promises;
const TypeScriptGenerator = require('../../core/typescript');

describe('TypeScriptGenerator', () => {
  const models = {
    categories: {
      fields: {
        name: { type: 'string', required: true, description: 'Display name' },
        email: 'email',
        tags: ['string'],
        status: { type: 'string', name: 'status', enum: ['draft-post', '2live'] }
      }
    }
  };

  it('generates common, enum, model, and API types from rich and shorthand fields', () => {
    const generator = new TypeScriptGenerator();

    const output = generator.generateFromModels(models);

    expect(output).toContain('export enum StatusEnum');
    expect(output).toContain("DRAFT_POST = 'draft-post'");
    expect(output).toContain("_2LIVE = '2live'");
    expect(output).toContain('export interface category extends BaseEntity');
    expect(output).toContain('/** Display name */');
    expect(output).toContain('name: string;');
    expect(output).toContain('email?: string;');
    expect(output).toContain('tags?: string[];');
    expect(output).toContain('status?: StatusEnum;');
    expect(output).toContain('export namespace categoryAPI');
    expect(generator.getAllTypes()).toBe(output);
  });

  it('generates client SDK, React hooks, and validation schemas with singularized names', () => {
    const generator = new TypeScriptGenerator();

    expect(generator.generateClientSDK(models, 'https://api.example.test')).toContain('async getcategory(id: string)');
    expect(generator.generateReactHooks(models)).toContain('export function usecategory(id: string)');
    expect(generator.generateValidationSchemas(models)).toContain('export const categorySchema');
    expect(generator.generateValidationSchemas(models)).toContain('name: { required: true }');
    expect(generator.generateValidationSchemas(models)).toContain('email: { email: true }');
  });

  it('exports generated type files', async () => {
    const generator = new TypeScriptGenerator();
    generator.generateFromModels(models);

    const mkdirSpy = jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    const writeSpy = jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

    await generator.exportToFiles('C:/tmp/easyjs-types-test');

    expect(mkdirSpy).toHaveBeenCalledWith('C:/tmp/easyjs-types-test', { recursive: true });
    expect(writeSpy).toHaveBeenCalledWith(
      expect.stringContaining('index.ts'),
      expect.stringContaining('export interface category'),
      'utf-8'
    );

    mkdirSpy.mockRestore();
    writeSpy.mockRestore();
  });
});
