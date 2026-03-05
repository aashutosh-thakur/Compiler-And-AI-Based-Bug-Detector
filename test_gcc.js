const { execSync } = require('child_process');

const gcc = 'C:\\MinGW\\bin\\gcc.exe';
const file = 'c:\\Users\\thaku\\Downloads\\Project\\test_samples\\low_bugs.c';

const tests = [
    [gcc, `-fsyntax-only "${file}"`],
    [gcc, `-Wall "${file}" -fsyntax-only`],
    [gcc, `"${file}" -Wall -c -o NUL`],
    [gcc, `-Wall "${file}" -c -o NUL`],
    [gcc, `-E "${file}"`],  // preprocessor only
];

for (const [cmd, args] of tests) {
    const full = `"${cmd}" ${args}`;
    console.log(`\nTEST: ${full}`);
    try {
        const out = execSync(full, { encoding: 'utf-8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] });
        console.log(`  OK (exit 0), stdout[${out.length}]`);
    } catch (e) {
        console.log(`  EXIT: ${e.status}`);
        console.log(`  stdout[${(e.stdout || '').length}]: ${(e.stdout || '').substring(0, 200)}`);
        console.log(`  stderr[${(e.stderr || '').length}]: ${(e.stderr || '').substring(0, 200)}`);
    }
}
