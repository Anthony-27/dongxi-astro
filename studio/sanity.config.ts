import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemas';

export default defineConfig({
  name:    'dongxi-studio',
  title:   'DONGXI Studio',

  // ⬇️  在 sanity.io/manage 新建项目后填入
  projectId: '0brclyd6',
  dataset:   'production',

  plugins: [
    structureTool(),
    visionTool(),   // 可以在后台直接运行 GROQ 查询，调试用
  ],

  schema: { types: schemaTypes },
});
