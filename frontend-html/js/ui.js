import { FieldManager } from './fieldManager.js';
import { SettingsManager } from './settingsManager.js';

export class UIManager {
    constructor(settingsManager) {
        console.log('Updating!')
        this.fieldManager = new FieldManager();
        this.settingsManager = settingsManager;
        this.setupEventListeners();
        this.setupTips();
        this.setupComments();
        this.initializeFields();
    }

    async initializeFields() {
        try {
            await this.fieldManager.loadFields();
            this.fieldManager.setupFieldAutocomplete();
            this.fieldManager.setupLegend();
            this.fieldManager.setupConstellationAdd();
            this.fieldManager.setupConstellationInteractions();
            this.fieldManager.addFieldAnnotations();
        } catch (error) {
            console.error('Failed to load fields:', error);
            this.showError('Failed to load academic fields');
        }
    }

    setupEventListeners() {
        // Menu item click handlers
        $('.menu-item').on('click', (e) => {
            const target = $(e.currentTarget).data('target');
            this.showSection(target);
        });

        // Close buttons
        $('.close-btn').on('click', (e) => {
            const target = $(e.currentTarget).data('target');
            this.hideSection(target);
        });

        // Toggle switches
        $('.toggle-switch').on('click', (e) => {
            const target = $(e.currentTarget).data('target');
            this.toggleSection(target);
        });

        // Field mode toggle
        $('#field_mode').on('click', () => {
            $(".right_boy").toggle(false);
            $("#legend").toggle(true);
        });

        // Constellation mode toggle
        $('#constellations').on('click', () => {
            $(".right_boy").toggle(false);
            $("#constellation").toggle(true);
        });

        // Constellation panel interactions
        $('#constellation').on('click', '.constellation-item', (e) => {
            const field = $(e.currentTarget).data('field');
            this.highlightField(field);
        });

        // Search functionality
        $('#search-input').on('input', (e) => {
            const query = $(e.currentTarget).val().toLowerCase();
            this.filterConstellationItems(query);
        });
    }

    setupTips() {
        const tips = [
            "Navigation: Use the Left and Right Arrow Keys to move left and right. Use the Up and Down Arrow Keys to move forward and backwards. Use R and F to move the ship up and down",
            "Use the Space Bar to boost forward. Click and Drag to explore around.",
            "Double click to enter the cloud and propel forward in the cloud. To exit the cloud, Press \"S\" or Down Key and the Space Bar to boost",
            "Colored Dots: Click on the colored dots to reveal academic paper titles and links.",
            "Filter: Add a filter to specify the discipline you want to focus on exploring.",
            "Constellation: Select and layer constellations to see how disciplines intersect. Combine filter tool and constellation to explore papers and the intersection of multiple disciplines.",
            "Click on 'The Knowledge Cosmos' to return to your first view of the cloud."
        ];

        // Create tips container
        $('#tips').empty();
        tips.forEach((tip, index) => {
            $('#tips').append(`
                <p id="tip${index}" ${index === 0 ? 'class="focused"' : ''}>${tip}</p>
            `);
        });

        // Add navigation elements
        $('#tips').append(`
            <span id="tips_next">Next</span>
            <span id="tips_close">Close</span>
        `);

        // Setup event handlers
        $('#tips_next').on('click', () => this.nextTip());
        $('#tips_close').on('click', () => {
            $('#tips').fadeOut(300);
            clearTimeout(this.nextTipTimeout);
        });
        
        // Start the tips rotation
        this.nextTipTimeout = setTimeout(() => this.nextTip(), 5000);

        // Listener for the tips link
        $('#tips_link').on('click', () => {
            $('#tips').fadeIn(300);
        });
    }

    nextTip() {
        const current = $("#tips p.focused");
        let next = current.next();
        
        // If we hit the navigation spans, go back to first tip
        if (next.prop('tagName') === 'SPAN') {
            next = $("#tips p").first();
        }
        
        current.removeClass('focused').fadeOut(400, () => {
            next.addClass('focused').fadeIn(400);
        });
        
        clearTimeout(this.nextTipTimeout);
        this.nextTipTimeout = setTimeout(() => this.nextTip(), 5000);
    }

    setupComments() {
        $('#comment-box').hide();
        $('#comment_link').on('click', () => {
            $('#comment_box').toggle();
        });
    }

    showSection(sectionId) {
        $(`#${sectionId}`).fadeIn(300);
        $('.menu-item').removeClass('active');
        $(`.menu-item[data-target="${sectionId}"]`).addClass('active');
    }

    hideSection(sectionId) {
        $(`#${sectionId}`).fadeOut(300);
        $('.menu-item').removeClass('active');
    }

    toggleSection(sectionId) {
        const section = $(`#${sectionId}`);
        if (section.is(':visible')) {
            this.hideSection(sectionId);
        } else {
            this.showSection(sectionId);
        }
    }

    highlightField(field) {
        $('.constellation-item').removeClass('active');
        $(`.constellation-item[data-field="${field}"]`).addClass('active');
        // Additional field highlighting logic can be added here
    }

    filterConstellationItems(query) {
        $('.constellation-item').each((_, item) => {
            const text = $(item).text().toLowerCase();
            $(item).toggle(text.includes(query));
        });
    }

    showLoading() {
        $('#loading-overlay').fadeIn(300);
    }

    hideLoading() {
        $('#loading-overlay').fadeOut(300);
    }

    updateProgress(percent) {
        $('#loading-progress').css('width', `${percent}%`);
    }

    showError(message) {
        const errorDiv = $('<div class="error-message">').text(message);
        $('#error-container').append(errorDiv);
        setTimeout(() => {
            errorDiv.fadeOut(300, () => errorDiv.remove());
        }, 5000);
    }
} 