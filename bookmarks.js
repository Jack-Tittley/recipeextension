document.addEventListener('DOMContentLoaded', function () {
    const bookmarkList = document.getElementById('bookmarkList');
    const modal = document.getElementById('recipeModal');
    const modalContent = document.getElementById('modalContent');
    const closeModal = document.querySelector('.close-modal');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importInput = document.getElementById('importInput');

    exportBtn.addEventListener('click', exportRecipes);
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', importRecipes);

    function exportRecipes() {
        chrome.storage.sync.get(['bookmarks'], function (result) {
            const bookmarks = result.bookmarks || [];
            const dataStr = JSON.stringify(bookmarks, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = 'recipe_bookmarks.json';
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
        });
    }

    function importRecipes(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const bookmarks = JSON.parse(e.target.result);
                    if (Array.isArray(bookmarks)) {
                        // Ask for confirmation before importing
                        if (confirm('This will replace all existing recipes. Continue?')) {
                            chrome.storage.sync.set({ bookmarks }, function() {
                                alert('Recipes imported successfully!');
                                renderBookmarks();
                            });
                        }
                    } else {
                        alert('Invalid file format. Please use a valid recipe bookmarks JSON file.');
                    }
                } catch (error) {
                    alert('Error reading file: Please make sure it\'s a valid JSON file');
                }
            };
            reader.readAsText(file);
        }
        // Reset the input so the same file can be imported again if needed
        event.target.value = '';
    }
    
   



    function renderBookmarks() {
        chrome.storage.sync.get(['bookmarks'], function (result) {
            const bookmarks = result.bookmarks || dummyRecipes;
            bookmarkList.innerHTML = '';

            
            const sectionsContainer = document.createElement('div');
            sectionsContainer.classList.add('bookmark-sections-container');

           
            const favorites = bookmarks.filter(bookmark => bookmark.favorite);
            const nonFavorites = bookmarks.filter(bookmark => !bookmark.favorite);

            
            const favoritesSection = document.createElement('div');
            favoritesSection.classList.add('bookmark-section');
            
            const favoritesTitle = document.createElement('h2');
            favoritesTitle.classList.add('section-title');
            favoritesTitle.textContent = 'Favorite Recipes';
            favoritesSection.appendChild(favoritesTitle);

            const favoritesGrid = document.createElement('div');
            favoritesGrid.classList.add('bookmark-grid');
            
            if (favorites.length > 0) {
                favorites.forEach(bookmark => {
                    createBookmarkCard(bookmark, bookmarks.indexOf(bookmark), favoritesGrid);
                });
            } else {
                const noFavoritesMsg = document.createElement('div');
                noFavoritesMsg.classList.add('no-favorites-message');
                noFavoritesMsg.textContent = 'No favorite recipes yet';
                favoritesGrid.appendChild(noFavoritesMsg);
            }
            
            favoritesSection.appendChild(favoritesGrid);

            
            const nonFavoritesSection = document.createElement('div');
            nonFavoritesSection.classList.add('bookmark-section');
            
            const nonFavoritesTitle = document.createElement('h2');
            nonFavoritesTitle.classList.add('section-title');
            nonFavoritesTitle.textContent = 'All Recipes';
            nonFavoritesSection.appendChild(nonFavoritesTitle);

            const nonFavoritesGrid = document.createElement('div');
            nonFavoritesGrid.classList.add('bookmark-grid');
            nonFavorites.forEach(bookmark => {
                createBookmarkCard(bookmark, bookmarks.indexOf(bookmark), nonFavoritesGrid);
            });
            nonFavoritesSection.appendChild(nonFavoritesGrid);

          
            sectionsContainer.appendChild(favoritesSection);
            sectionsContainer.appendChild(nonFavoritesSection);
            bookmarkList.appendChild(sectionsContainer);
        });
    }

    function createBookmarkCard(bookmark, index, container) {
        const card = document.createElement('div');
        card.classList.add('bookmark-card');
        card.dataset.index = index; 
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-btn');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this recipe?')) {
                const cardIndex = parseInt(card.dataset.index);
                deleteBookmark(cardIndex);
            }
        };
        card.appendChild(deleteBtn);
        const favoriteIcon = document.createElement('i');
        favoriteIcon.classList.add('fas', 'fa-star', 'favorite-icon');
        if (bookmark.favorite) {
            favoriteIcon.classList.add('active');
        }
        favoriteIcon.onclick = (e) => {
            e.stopPropagation();
            const cardIndex = parseInt(card.dataset.index);
            toggleFavorite(cardIndex);
        };

        

        
        const title = document.createElement('h2');
        title.textContent = bookmark.title;

        const url = document.createElement('p');
        const link = document.createElement('a');
        link.href = bookmark.url;
        link.textContent = 'Link To Recipe';
        link.target = '_blank';
        url.appendChild(link);

        const noteSection = document.createElement('div');
        noteSection.classList.add('note-section');
        const noteTextarea = document.createElement('textarea');
        noteTextarea.classList.add('note-textarea');
        noteTextarea.value = bookmark.note;
        noteTextarea.placeholder = 'Add a note...';

        const saveNoteBtn = document.createElement('button');
        saveNoteBtn.classList.add('save-note-btn');
        saveNoteBtn.textContent = 'Save Note';
        saveNoteBtn.onclick = (e) => {
            e.stopPropagation();
            const cardIndex = parseInt(card.dataset.index);
            saveNote(cardIndex, noteTextarea.value);
        };

        const prepTime = document.createElement('p');
        prepTime.textContent = `Prep Time: ${bookmark.prepTime}`;
        const cookTime = document.createElement('p');
        cookTime.textContent = `Cook Time: ${bookmark.cookTime}`;
        const totalTime = document.createElement('p');
        totalTime.textContent = `Total Time: ${bookmark.totalTime}`;

        const moreInfoBtn = document.createElement('button');
        moreInfoBtn.classList.add('more-info-btn');
        moreInfoBtn.textContent = 'More Information';
        moreInfoBtn.onclick = () => showRecipeDetails(bookmark);

        card.appendChild(favoriteIcon);
        card.appendChild(title);
        card.appendChild(url);
        card.appendChild(noteSection);
        noteSection.appendChild(noteTextarea);
        noteSection.appendChild(saveNoteBtn);
        card.appendChild(prepTime);
        card.appendChild(cookTime);
        card.appendChild(totalTime);
        card.appendChild(moreInfoBtn);

        container.appendChild(card);
    }

    function toggleFavorite(index) {
        chrome.storage.sync.get(['bookmarks'], function (result) {
            const bookmarks = result.bookmarks || dummyRecipes;
            if (index >= 0 && index < bookmarks.length) {
                bookmarks[index].favorite = !bookmarks[index].favorite;
                chrome.storage.sync.set({ bookmarks }, function() {
                    renderBookmarks();
                });
            }
        });
    }
   
    function saveNote(index, newNote) {
        chrome.storage.sync.get(['bookmarks'], function (result) {
            const bookmarks = result.bookmarks || [];
            bookmarks[index].note = newNote;
            chrome.storage.sync.set({ bookmarks }, function() {
                console.log('Note saved');
            });
        });
    }

    
function deleteBookmark(index) {
    chrome.storage.sync.get(['bookmarks'], function (result) {
        const bookmarks = result.bookmarks || [];
        bookmarks.splice(index, 1);
        chrome.storage.sync.set({ bookmarks }, function() {
            renderBookmarks();
        });
    });
}

    function showRecipeDetails(recipe) {
        modalContent.innerHTML = `
            <h2>${recipe.title}</h2>
            <p><strong>Prep Time:</strong> ${recipe.prepTime}</p>
            <p><strong>Cook Time:</strong> ${recipe.cookTime}</p>
            <h3>Ingredients:</h3>
            <ul>
                ${recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}
            </ul>
            <h3>Instructions:</h3>
            <pre class="text">${recipe.instructions.toString()}</pre>
        `;
        modal.style.display = 'block';
    }

    closeModal.onclick = function() {
        modal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }

    renderBookmarks();
});