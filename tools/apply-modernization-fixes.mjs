#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const fixes = [
  {
    path: 'app/main/projectManager.ts',
    from: 'interface SourceRow extends SourceRecord {}',
    to: 'type SourceRow = SourceRecord;'
  },
  {
    path: 'app/main/services/ollama.ts',
    from: "          this.proc && !this.proc.killed && this.proc.kill('SIGTERM');",
    to: "          if (this.proc && !this.proc.killed) {\n            this.proc.kill('SIGTERM');\n          }"
  },
  {
    path: 'app/renderer/src/components/ProjectSettingsModal.tsx',
    from: '    } catch (e) {\n      // noop - could add toast later',
    to: '    } catch {\n      // noop - could add toast later'
  },
  {
    path: 'app/renderer/src/components/GraphWorkspace.tsx',
    from: '  filterRef: React.RefObject<HTMLDivElement>;',
    to: '  filterRef: React.RefObject<HTMLDivElement | null>;'
  },
  {
    path: 'app/renderer/src/components/TitleBar.tsx',
    from: '                ref={(el) => (menuRefs.current[menuName] = el)}',
    to: '                ref={(el) => {\n                  menuRefs.current[menuName] = el;\n                }}'
  },
  {
    path: 'tsconfig.base.json',
    from: '    "target": "ES2021",\n    "lib": ["DOM", "ES2021"],',
    to: '    "target": "ES2022",\n    "lib": ["DOM", "ES2022"],'
  }
];

for (const fix of fixes) {
  const source = readFileSync(fix.path, 'utf8');
  if (source.includes(fix.to)) continue;
  if (!source.includes(fix.from)) {
    throw new Error(`Expected modernization source pattern not found in ${fix.path}`);
  }
  writeFileSync(fix.path, source.replace(fix.from, fix.to), 'utf8');
  console.log(`Updated ${fix.path}`);
}
