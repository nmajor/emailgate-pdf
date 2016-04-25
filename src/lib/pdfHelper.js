import pdf from 'html-pdf';
import pdfjs from 'pdfjs-dist';
import { log } from './logHelper';

export function getPdfPages(buffer) {
  return new Promise((resolve) => {
    pdfjs.getDocument(buffer).then((doc) => {
      resolve(doc.numPages);
    });
  });
}

export function buildPdf(html, model, obj) {
  return new Promise((resolve) => {
    return pdf.create(html, emailOptions).toBuffer((err, buffer) => {
      if (err) { log('error', `An error happened while generating a ${model} PDF.`, err.message); return; }

      getPdfPages(buffer)
			.then((pageCount) => {
        resolve({ // eslint-disable-line indent
          model,
          _id: obj._id,
          _compilation: obj._compilation,
          pageCount,
          buffer,
        });
			});
    });
  });
}

export function uploadPdfObject(pdfObj) {
  return new Promise((resolve) => {
    const path = `compilations/${pdfObj._compilation}/${pdfObj.model}-${pdfObj._id}.pdf`;
    const fullPath = `${process.env.MANTA_APP_PUBLIC_PATH}/${path}`;

    const pdfStream = new BufferStream(pdfObj.buffer);

    client.put(fullPath, pdfStream, { mkdirs: true }, (err) => {
      if (err) { log('error', 'An error happened while uploading the pdf.', err.message); return; }

      client.info(fullPath, (err, results) => { // eslint-disable-line no-shadow
        if (err) { log('error', 'An error happened while getting the pdf file info.', err.message); return; }

        const updatedAt = Date.now();
        const fileUrl = `${process.env.MANTA_APP_URL}/${fullPath}`;

        resolve({
          model: pdfObj.model,
          _id: pdfObj._id,
          pdfPageCount: pdfObj.pageCount,
          url: fileUrl,
          updatedAt,
          path: fullPath,
          extension: results.extension,
          type: results.type,
          etag: results.etag,
          md5: results.md5,
          size: results.size,
        });
      });
    });
  });
}
