// T6: opening an image (JPG, PNG, WEBP) displays an <img> in the viewer
// Verifica que al abrir un archivo de imagen compatible:
// 1. Se crea un elemento <img>
// 2. Se invoca URL.createObjectURL con el archivo exacto
// 3. El src del <img> recibe la URL generada
// 4. El <img> es insertado en el visor

const assert = require('assert');

// Estructura de pruebas con casos parametrizados
const testCases = [
  { name: 'partitura.png',  type: 'image/png' },
  { name: 'escaneo.jpg',    type: 'image/jpeg' },
  { name: 'foto.webp',      type: 'image/webp' },
];

const { handleFileOpen } = require('../app.js');

async function testImageFormat(fileInfo) {
  let createdElement = null;
  let objectUrlArg = null;
  const expectedUrl = `blob:mock-uuid-${fileInfo.name}`;

  // Mock scoped para esta ejecución
  global.document = {
    createElement: (tag) => {
      const el = { tagName: tag.toUpperCase() };
      if (tag === 'img') createdElement = el;
      return el;
    },
  };

  global.URL = {
    createObjectURL: (obj) => {
      objectUrlArg = obj;
      return expectedUrl;
    },
  };

  const appended = [];
  const container = {
    appendChild: (el) => appended.push(el),
    querySelectorAll: () => [],
  };
  const emptyState = {};

  const file = { type: fileInfo.type, name: fileInfo.name };

  await handleFileOpen(file, container, emptyState);

  // 1. Debe haber creado un elemento <img>
  assert.ok(createdElement, `Debe crear un <img> para formato ${fileInfo.type}`);

  // 2. Debe invocar createObjectURL pasando el archivo real (no hardcodeado)
  assert.strictEqual(
    objectUrlArg,
    file,
    `URL.createObjectURL debió recibir el archivo ${fileInfo.name}`
  );

  // 3. El src debe ser exactamente el valor retornado por createObjectURL
  assert.strictEqual(
    createdElement.src,
    expectedUrl,
    `img.src debe recibir la URL generada para ${fileInfo.type}`
  );

  // 4. El elemento creado debe agregarse al visor
  assert.ok(
    appended.includes(createdElement),
    `El <img> debe agregarse al visor para ${fileInfo.type}`
  );
}

async function run() {
  for (const testCase of testCases) {
    await testImageFormat(testCase);
  }

  console.log('✅ T6 passed: opening images (PNG, JPG, WEBP) displays an <img> in the viewer with valid blob URL');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
