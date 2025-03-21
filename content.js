let lastExtractedText = '';  
let locationData = {};  

async function loadCSV() {
  const response = await fetch(chrome.runtime.getURL('data.csv'));
  const text = await response.text();

  Papa.parse(text, {
    header: true, 
    skipEmptyLines: true, 
    complete: function(results) {
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

function checkText() {
  const container = document.querySelector('.container-fluid');

  if (container) {
    const secondLevelElements = container.querySelectorAll('[class*="sc-"]');
    
    secondLevelElements.forEach((secondLevelElement) => {
      const targetElement = secondLevelElement.querySelector('[class*="sc-"]');

      if (targetElement) {
        const xpathResult = document.evaluate('/html/body/div[1]/div[2]/div[2]/div/div/div[2]/div[1]/div[1]/div[2]/text()', document, null, XPathResult.STRING_TYPE, null);
        const extractedText = xpathResult.stringValue.trim();

        if (extractedText !== lastExtractedText) {
          lastExtractedText = extractedText;
          console.log(`Wyciągnięty tekst z XPath: "${extractedText}"`);

          if (locationData.hasOwnProperty(extractedText)) {
            const positionText = locationData[extractedText];
            console.log(`Dopasowana pozycja: "${positionText}"`);

            const targetXPath = document.evaluate('//*[@id="root"]/div[2]/div[2]/div/div/div[2]/div[1]/div[1]/div[2]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

            if (targetXPath) {
              let existingSpan = targetXPath.querySelector('span.position-text');
              
              if (!existingSpan) {
                // Jeśli nie ma, tworzymy nowy element span
                existingSpan = document.createElement('span');
                existingSpan.classList.add('position-text'); 
                existingSpan.style.marginLeft = '10px'; 
                existingSpan.style.fontWeight = 'bold';
                targetXPath.appendChild(existingSpan);
              }

              existingSpan.textContent = positionText;
            }
          } else {
            console.log("Nie znaleziono dopasowania w CSV.");
          }
        }
      }
    });
  }
}

const observer = new MutationObserver(() => {
  checkText();
});

const container = document.querySelector('.container-fluid');
if (container) {
  observer.observe(container, {
    childList: true,
    subtree: true,
    attributes: true, 
  });
}

loadCSV();
