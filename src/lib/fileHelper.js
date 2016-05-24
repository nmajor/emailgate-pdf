import fs from 'fs';

export function deleteFile(filePath) {
  return new Promise((resolve) => {
    fs.unlink(filePath, () => {
      resolve();
    });
  });
}

export function deleteFiles(filePaths) {
  return Promise.all(filePaths.map((filePath) => { return deleteFile(filePath); }));
}
