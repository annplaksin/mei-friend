importScripts("https://www.verovio.org/javascript/develop/verovio-toolkit-hum.js");
// importScripts(`../verovio-toolkit-hum.js`);

var tk;
var tkOptions;

loadVerovio = function() {
  /* create the worker toolkit instance */
  console.log('Loading toolkit...');
  tk = new verovio.toolkit();
  let message = {
    'cmd': 'vrvLoaded',
    'version': tk.getVersion(),
    'availableOptions': tk.getAvailableOptions()
  };
  console.log('...done.')
  postMessage(message);
  return;
}
loadVerovio.bind(this);

onmessage = function(e) {
  let result = e.data;
  if (!tk && e.data.cmd !== 'loadVerovio') return result;
  console.info("Worker received: " + result.cmd + ', ', result); // + ', tk:', tk);
  switch (result.cmd) {
    case 'loadVerovio':
      Module.onRuntimeInitialized = loadVerovio();
      return;
    case 'updateAll':
      try {
        var tkOptions = result.options;
        tk.setOptions(tkOptions);
        tk.loadData(result.mei);
        result.mei = '';
        if (result.xmlId) {
          result.pageNo = parseInt(tk.getPageWithElement(result.xmlId));
        }
        result.svg = tk.renderToSVG(result.pageNo);
        result.pageCount = tk.getPageCount();
        result.cmd = 'updated';
      } catch (e) {
        log(e);
      };
      break;
    case 'updateData':
      try {
        tk.loadData(result.mei);
        result.mei = '';
        if (result.xmlId) {
          result.pageNo = parseInt(tk.getPageWithElement(result.xmlId));
        }
        result.svg = tk.renderToSVG(result.pageNo);
        result.pageCount = tk.getPageCount();
        result.cmd = 'updated';
      } catch (e) {
        log(e);
      };
      break;
    case 'updatePage':
      try {
        result.setCursorToPageBeginning = true;
        if (result.xmlId) {
          result.pageNo = parseInt(tk.getPageWithElement(result.xmlId));
          result.setCursorToPageBeginning = false;
        }
        result.svg = tk.renderToSVG(result.pageNo);
        result.cmd = 'updated';
      } catch (e) {
        log(e);
      };
      break;
    case 'updateLayout':
      try {
        var tkOptions = result.options;
        tk.setOptions(tkOptions);
        tk.redoLayout();
        result.setCursorToPageBeginning = true;
        if (result.xmlId) {
          result.pageNo = parseInt(tk.getPageWithElement(result.xmlId));
          result.setCursorToPageBeginning = false;
        }
        result.svg = tk.renderToSVG(result.pageNo);
        result.pageCount = tk.getPageCount();
        result.cmd = 'updated';
      } catch (e) {
        log(e);
      };
      break;
    case 'updateOption': // just update option without redoing layout
      try {
        var tkOptions = result.options;
        tk.setOptions(tkOptions);
        result.setCursorToPageBeginning = true;
        if (result.xmlId) {
          result.pageNo = parseInt(tk.getPageWithElement(result.xmlId));
          result.setCursorToPageBeginning = false;
        }
        result.svg = tk.renderToSVG(result.pageNo);
        result.pageCount = tk.getPageCount();
        result.cmd = 'updated';
      } catch (e) {
        log(e);
      };
      break;
    case 'importData': // all non-MEI formats
      try {
        tk.setOptions({
          inputFrom: result.format
        })
        tk.loadData(result.mei);
        result = {
          'cmd': 'mei',
          'mei': tk.getMEI(),
          'pageCount': tk.getPageCount()
        };
        if (tkOptions) tk.setOptions(tkOptions);
      } catch (e) {
        log(e);
      }
      break;
    case 'importBinaryData': // compressed XML format
      console.log('importBinaryData ' +
        result.mei.byteLength + ' / ', result.mei);
      try {
        tk.setOptions({
          inputFrom: result.format
        })
        // tk.loadZipDataBase64(result.mei);
        tk.loadZipDataBuffer(result.mei, result.mei.byteLength)
        result = {
          'cmd': 'mei',
          'mei': tk.getMEI(),
          'pageCount': tk.getPageCount()
        };
        if (tkOptions) tk.setOptions(tkOptions);
      } catch (e) {
        log(e);
      }
      break;
    case 'reRenderMei':
      try {
        tk.loadData(result.mei);
        result.setCursorToPageBeginning = true;
        if (result.xmlId && !result.removeIds) {
          result.pageNo = parseInt(tk.getPageWithElement(result.xmlId));
          result.setCursorToPageBeginning = false;
        }
        result.svg = tk.renderToSVG(result.pageNo);
        result.pageCount = tk.getPageCount();
        if (result.removeIds) result.mei = tk.getMEI({
          'removeIds': result.removeIds
        })
        else result.mei = tk.getMEI();
        result.cmd = 'updated';
      } catch (e) {
        log(e);
      }
      break;
    case 'navigatePage': // for a page turn during navigation
      try { // returns original message plus svg
        result.svg = tk.renderToSVG(result.pageNo);
      } catch (e) {
        log(e);
      }
      break;
    case 'computePageBreaks': // compute page breaks
      try {
        console.log('Worker computePageBreaks started');
        var tkOptions = result.options;
        tk.setOptions(tkOptions);
        tk.loadData(result.mei);
        result.pageCount = tk.getPageCount();
        result.pageBreaks = {};
        let idString = '';
        for (let p = 1; p <= result.pageCount; p++) {
          let svgText = tk.renderToSVG(p);
          let it = svgText
            .matchAll(/g([^>]+)(?:class=)(?:['"])(?:measure)(?:['"])/g);
          for (let i of it) {
            idString = String(i);
          }
          let match = idString.match(/(['"])[^'"]*\1/);
          let id = match[0].replace(/['"]/g, '');
          console.log('svg p.' + p + ':', id);
          updateProgressbar(p / result.pageCount * 100);
          console.log('Progress: ' + p / result.pageCount * 100 + '%')
          result.pageBreaks[p] = id;
        }
        // pb.innerHTML += 'done.';
        console.log('Worker computePageBreaks: ', result.pageBreaks);
      } catch (e) {
        log(e);
      }
      break;
    case 'exportMidi': // re-load data and export MIDI base-64 string
      try { //
        var tkOptions = result.options;
        tk.setOptions(tkOptions);
        tk.loadData(result.mei);
        result.midi = tk.renderToMIDI();
        result.cmd = 'midi';
      } catch (e) {
        log(e);
      }
      break;
    case 'getTimeForElement':
      try {
        result = {
          'cmd': 'timeForElement',
          'msg': tk.getTimeForElement(result.mei)
        };
      } catch (e) {
        log(e);
      }
      break;
    case 'getElementAttr':
      try {
        result = {
          'cmd': 'elementAttr',
          'msg': tk.getElementAttr(result.mei)
        };
      } catch (e) {
        log(e);
      }
      break;
    case 'stop':
      result = {
        'cmd': 'stopped',
        'msg': 'Worker stopped: ' + result.msg + '.'
      };
      close(); // Terminates the worker.
      break;
    default:
      result = {
        'cmd': result.cmd,
        'msg': 'Unknown command: ' + result.msg
      };
  };
  if (result) postMessage(result);
}

function log(e) {
  console.log('Worker error: ', e);
  return;
}

function updateProgressbar(perc) {
  postMessage({
    'cmd': 'updateProgressbar',
    'percentage': perc
  });
}
