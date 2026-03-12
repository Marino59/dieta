const fs = require('fs');
let code = fs.readFileSync('app/page.js', 'utf-8');

// Rescale huge tailwind arbitrary rem values like text-[10rem]
code = code.replace(/text-\[(.*?)rem\]/g, (match, valStr) => {
    const val = parseFloat(valStr);
    if (val >= 10) return 'text-7xl';
    if (val >= 6) return 'text-5xl';
    if (val >= 4.5) return 'text-4xl';
    if (val >= 3) return 'text-3xl';
    if (val >= 2) return 'text-xl';
    return 'text-lg';
});

// Rescale w-[30rem]
code = code.replace(/w-\[(.*?)rem\]/g, (match, valStr) => {
    const val = parseFloat(valStr);
    if (val >= 30) return 'w-64 max-w-full';
    if (val >= 20) return 'w-48';
    if (val >= 15) return 'w-32';
    return match;
});

// Rescale h-[65rem]
code = code.replace(/h-\[(.*?)rem\]/g, (match, valStr) => {
    const val = parseFloat(valStr);
    if (val >= 50) return 'h-80'; // e.g. 65rem -> h-80
    if (val >= 30) return 'h-64';
    if (val >= 20) return 'h-48';
    if (val >= 10) return 'h-24';
    return match;
});

// Rescale rounded sizes to normal tailwind scales
code = code.replace(/rounded-\[(.*?)rem\]/g, (match, valStr) => {
    const val = parseFloat(valStr);
    if (val >= 4) return 'rounded-3xl';
    if (val >= 2.5) return 'rounded-2xl';
    if (val >= 1.5) return 'rounded-xl';
    return 'rounded-lg';
});

// Scale down standard spacing classes like p-16, gap-12, size-32
const attributesToScale = ['p-', 'px-', 'py-', 'pt-', 'pb-', 'm-', 'mx-', 'my-', 'mt-', 'mb-', 'gap-', 'size-', 'w-', 'h-', 'top-', 'bottom-', 'left-', 'right-'];
const regex = new RegExp(`(?<=\\s|["']|^)(${attributesToScale.join('|')})(\\d+)(?=\\s|["']|$)`, 'g');

code = code.replace(regex, (match, prefix, numStr) => {
    let num = parseInt(numStr, 10);
    if (num > 20) { num = Math.round(num / 2.5); }
    else if (num > 10) { num = Math.round(num / 2); }
    else if (num > 6) { num = Math.round(num / 1.5); }

    const steps = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64];
    const closest = steps.reduce((a, b) => Math.abs(b - num) < Math.abs(a - num) ? b : a);
    return prefix + closest;
});

fs.writeFileSync('app/page.js', code);
console.log('App/page.js rescaled successfully.');
