let lastURL = window.location.href;// Tu chciałem, by kod pamietał zmiane strony a to po to by kod dzialal tylko na matches i internal
let extensionInitialized = false;
let observer = null;

// tu sprawdza czy pasuje do chcianego linku
function isValidPage(url) {
  return url.includes('/internal') || url.includes('/matches');
}

function checkURLChange() {
  const currentURL = window.location.href;

  if (currentURL !== lastURL) {
    lastURL = currentURL;
    console.log("🔄 Wykryto zmianę URL:", currentURL);

    if (isValidPage(currentURL) && !extensionInitialized) {
      console.log("✅ Nowy URL pasuje – uruchamiam kod");
      initializeExtension();
      extensionInitialized = true;
    } else if (!isValidPage(currentURL)) {
      extensionInitialized = false;
    }
  }
}

// tu moga byc peoblemy jak ktos ma problem z netem to bedzie sprawdzal az sie zaladuje
//moze spowodowac jakies bugi w przyszlosci
setInterval(checkURLChange, 3000);

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

//glowna

function initializeExtension() {
  let locationData = {};

  async function loadCSV() {
    const response = await fetch(chrome.runtime.getURL('data.csv'));
    const text = await response.text();

    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        results.data.forEach(row => {
          const location = row["Location Description"]?.trim();
          const position = row["Position"]?.trim();
          if (location && position) {
            locationData[location] = position;
          }
        });

        console.log("Załadowane lokalizacje:", locationData);
      }
    });
  }

  function getXPathText(xpath) {
    const result = document.evaluate(xpath, document, null, XPathResult.STRING_TYPE, null);
    return result.stringValue.trim();
  }

  function updateText(xpathSource, xpathTarget) {
    const extractedText = getXPathText(xpathSource);
    if (!extractedText) return;

    console.log(`Wyciągnięty tekst z XPath: "${extractedText}"`);
    
    const targetElement = document.evaluate(xpathTarget, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (targetElement) {
      let existingSpan = targetElement.querySelector('span.position-text');
      if (!existingSpan) {
        existingSpan = document.createElement('span');
        existingSpan.classList.add('position-text');
        existingSpan.style.marginLeft = '10px';
        existingSpan.style.fontWeight = 'bold';
        targetElement.appendChild(existingSpan);
      }
      existingSpan.textContent = locationData[extractedText] || 'Brak dopasowania';
    }
  }

  const checkTextDebounced = debounce(() => {
    updateText(
      '/html/body/div[1]/div[2]/div[2]/div/div/div[2]/div[1]/div[1]/div[2]/text()',
      '//*[@id="root"]/div[2]/div[2]/div/div/div[2]/div[1]/div[1]/div[2]'
    );

    updateText(
      '//*[@id="root"]/div[2]/div[2]/div/div/div[2]/div[1]/div[2]/div[2]/div/div/div[2]/div/div/div/div/text()',
      '//*[@id="root"]/div[2]/div[2]/div/div/div[2]/div[1]/div[2]/div[2]/div/div/div[2]/div/div/div/div'
    );
  }, 500);

  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver(checkTextDebounced);
  const container = document.querySelector('.container-fluid');
  if (container) {
    observer.observe(container, { childList: true, subtree: true, attributes: true });
  }

  loadCSV();
}

// uruchamia kod jak jest w matches lub internal
if (isValidPage(window.location.href)) {
  initializeExtension();
} else {
  console.log("❌ Ta strona nie pasuje do /internal ani /matches. Czekam na zmianę URL...");
}
