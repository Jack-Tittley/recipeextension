document.addEventListener('DOMContentLoaded', function () {
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    const viewBtn = document.getElementById('viewBtn');

    // Utility function to parse ISO 8601 durations (e.g., PT1H30M45S)
    function convertDurationToReadable(duration) {
        const durationRegex = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
        const matches = duration.match(durationRegex);
        
        if (!matches) return 'Invalid duration';

        const hours = parseInt(matches[1] || 0);
        const minutes = parseInt(matches[2] || 0);
        const seconds = parseInt(matches[3] || 0);

        const parts = [];

        if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
        if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
        if (seconds > 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);

        return parts.join(' and ') || '0 minutes';
    }

    // Bookmark button click event
    bookmarkBtn.addEventListener('click', function () {
        // Get the current active tab
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const currentTab = tabs[0];
            const currentUrl = currentTab.url;

           
            chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                function: extractJSONLDRecipe,
            }, (results) => {
                if (results && results[0] && results[0].result) {
                    const recipeData = results[0].result;

                  
                    const prepTime = recipeData.prepTime ? convertDurationToReadable(recipeData.prepTime) : 'Not specified';
                    const cookTime = recipeData.cookTime ? convertDurationToReadable(recipeData.cookTime) : 'Not specified';
                    const totalTime = recipeData.totalTime ? convertDurationToReadable(recipeData.totalTime) : 'Not specified';

               
                    let formattedInstructions = '';
                    if (Array.isArray(recipeData.recipeInstructions)) {
                        formattedInstructions = recipeData.recipeInstructions
                            .filter(step => step.trim() !== '')
                            .map((step, index) => `${index + 1}. ${step}`)
                            .join('\n\n'); 
                    } else {
                        formattedInstructions = 'No instructions available';
                    }

                    
                    const ingredients = recipeData.recipeIngredient || [];
                    const title = recipeData.name || currentTab.title || 'No title';

                   
                    chrome.storage.sync.get(['bookmarks'], function (result) {
                        const bookmarks = result.bookmarks || [];

                       
                        const isBookmarked = bookmarks.some(bookmark => bookmark.url === currentUrl);

                        if (!isBookmarked) {
                            
                            bookmarks.push({
                                url: currentUrl,
                                title: title,
                                note: '',
                                prepTime: prepTime,
                                cookTime: cookTime,
                                totalTime: totalTime,
                                ingredients: ingredients,
                                instructions: formattedInstructions || 'No instructions available',
                                favorite: false
                            });

                            
                            chrome.storage.sync.set({ bookmarks }, function () {
                                console.log('Recipe Bookmarked:', currentUrl);
                            });
                        } else {
                            console.log('This URL is already bookmarked.');
                        }
                    });
                } else {
                    console.log('No valid recipe JSON-LD found on the page.');
                }
            });
        });
    });

   
    viewBtn.addEventListener('click', function () {
       
        chrome.tabs.create({ url: chrome.runtime.getURL('bookmarks.html') });
    });

    
    function extractJSONLDRecipe() {
       
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        let recipeData = null;

        scripts.forEach(script => {
            try {
                const json = JSON.parse(script.textContent);

                // Handle arrays at the top level (some pages might wrap data in an array)
                const jsons = Array.isArray(json) ? json : [json];

                jsons.forEach(item => {
                    // Check if the JSON-LD matches the schema.org Recipe structure
                    if (item['@type'] === 'Recipe') {
                        recipeData = {
                            name: item.name || '',
                            prepTime: item.prepTime || 'Not specified',
                            cookTime: item.cookTime || 'Not specified',
                            totalTime: item.totalTime || 'Not specified',
                            recipeIngredient: item.recipeIngredient || [],
                            recipeInstructions: []
                        };

                        const instructions = item.recipeInstructions;

                        // Handle different types of recipeInstructions
                        if (Array.isArray(instructions)) {
                            recipeData.recipeInstructions = instructions.map(step => {
                                if (typeof step === 'string') {
                                    return step;
                                } else if (typeof step === 'object' && step.text) {
                                    return step.text;
                                } else {
                                    return '';
                                }
                            });
                        } else if (typeof instructions === 'string') {
                            recipeData.recipeInstructions = [instructions];
                        } else {
                            recipeData.recipeInstructions = ['No instructions available'];
                        }
                    }
                });
            } catch (e) {
                console.error('Error parsing JSON-LD:', e);
            }
        });

        // Return the extracted recipe data, if any
        return recipeData;
    }
});