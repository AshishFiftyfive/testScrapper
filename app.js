const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 8000;

const keywords = [
    'blog', 'services', 'products', 'about', 'industries', 'Case Studies', 'Case Study',
    'Testimonials', 'Reviews', 'success stories', 'success story', 'solutions', 'who we are',
    'Technology', 'Resources', 'features', 'mission', 'solution'
];

// Function to fetch and parse a webpage
async function fetchPage(url) {
    try {
        const response = await axios.get(url);
        return cheerio.load(response.data);
    } catch (error) {
        console.error(`Error fetching page ${url}:`, error.message);
        return null;
    }
}

// Function to extract relevant content from a webpage
function extractContent($) {
    // Remove unwanted tags and scripts
    $('script, style, header, footer, nav').remove();
    return $('body').text().replace(/\s+/g, ' ').trim();
}

// Function to scrape the pages of interest
async function scrapePages(baseUrl, links) {
    let combinedData = '';
    let scrapedPages = [];

    for (const link of links) {
        try {
            const $ = await fetchPage(link);
            if ($) {
                const pageContent = extractContent($);
                combinedData += ` ${pageContent}`;
                scrapedPages.push(link);
            }
        } catch (error) {
            console.error(`Skipping page ${link} due to error:`, error.message);
        }
    }

    return { combinedData, scrapedPages };
}

// Function to find relevant links on the first page
function findRelevantLinks($, baseUrl) {
    const links = [];

    $('a').each((index, element) => {
        const href = $(element).attr('href');
        if (href) {
            const lowerHref = href.toLowerCase();
            if (keywords.some(keyword => lowerHref.includes(keyword))) {
                const fullUrl = new URL(href, baseUrl).toString();
                if (!links.includes(fullUrl)) {
                    links.push(fullUrl);
                }
            }
        }
    });

    return links;
}

// GET API to scrape website
app.get('/scrape', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Please provide a valid website URL.' });
    }

    try {
        const $ = await fetchPage(url);
        if (!$) {
            return res.status(500).json({ error: 'Failed to fetch the website.' });
        }

        const links = findRelevantLinks($, url);
        const { combinedData, scrapedPages } = await scrapePages(url, links);
        const responseData = combinedData.slice(0, 1000);

        res.json({
            data: responseData,
            totalLength: combinedData.length,
            scrapedPages,
        });
    } catch (error) {
        console.error('Error processing the request:', error.message);
        res.status(500).json({ error: 'An error occurred while processing your request.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
