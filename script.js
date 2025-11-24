async function fetchBlogPosts() {
    const postsContainer = document.getElementById('blog-posts');
    postsContainer.innerHTML = '<div class="loading">Loading posts...</div>';
    
    try {
        console.log('Fetching from GitHub API...');
        const response = await fetch('https://api.github.com/repos/Isu-Patel/Milan_Rutu_Project/contents');
        
        if (!response.ok) {
            throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
        }
        
        const files = await response.json();
        console.log('Files found:', files.length);
        console.log('File names:', files.map(f => f.name));
        
        // Filter for .md files
        const mdFiles = files.filter(f => 
            f.name.endsWith('.md') && 
            f.name.toLowerCase() !== 'readme.md' &&
            f.type === 'file'
        );
        
        console.log('Markdown files:', mdFiles.map(f => f.name));
        
        postsContainer.innerHTML = '';
        
        if (mdFiles.length === 0) {
            postsContainer.innerHTML = '<div class="error">No blog posts found in repository</div>';
            return;
        }
        
        // Sort by name (newest first)
        mdFiles.sort((a, b) => b.name.localeCompare(a.name));
        
        // Show only first blog or all based on showingAll flag
        const blogsToShow = (typeof showingAll !== 'undefined' && showingAll) ? mdFiles : [mdFiles[0]];
        
        for (const file of blogsToShow) {
            await displayBlog(file);
        }
        
        // Store for toggle function
        window.allBlogs = mdFiles;
        
    } catch (error) {
        console.error('Error:', error);
        postsContainer.innerHTML = `<div class="error">Error loading posts: ${error.message}<br><br>Make sure the repository is public and accessible.</div>`;
    }
}

async function displayBlog(file) {
    try {
        // Get actual commit time from GitHub
        const commitsResponse = await fetch(`https://api.github.com/repos/Isu-Patel/Milan_Rutu_Project/commits?path=${file.name}&per_page=1`);
        const commits = await commitsResponse.json();
        
        const response = await fetch(file.download_url);
        const content = await response.text();
        
        const article = document.createElement('article');
        article.className = 'blog-post';
        
        const title = file.name.replace('.md', '').replace(/-/g, ' ');
        
        // Get precise commit time
        let postDate = 'Recent';
        if (commits && commits.length > 0) {
            const commitTime = new Date(commits[0].commit.author.date);
            postDate = getTimeAgo(commitTime);
        }
        
        // Convert markdown to HTML
        const htmlContent = content
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(.+)$/gm, '<p>$1</p>')
            .replace(/<p><\/p>/g, '');
        
        article.innerHTML = `
            <h2 class="post-title">${title}</h2>
            <div class="post-meta">
                <span class="post-date">${postDate}</span>
            </div>
            <div class="post-content">
                ${htmlContent}
            </div>
        `;
        
        document.getElementById('blog-posts').appendChild(article);
        
    } catch (error) {
        console.error('Error loading blog:', file.name, error);
    }
}

function toggleAllBlogs() {
    if (typeof window.allBlogs === 'undefined') {
        console.log('No blogs loaded yet');
        return;
    }
    
    window.showingAll = !window.showingAll;
    const btn = document.getElementById('showAllBtn');
    const postsContainer = document.getElementById('blog-posts');
    
    if (window.showingAll) {
        btn.innerHTML = '📄 Show Recent Only';
        postsContainer.innerHTML = '';
        window.allBlogs.forEach(file => displayBlog(file));
    } else {
        btn.innerHTML = '📚 Show All Blogs';
        postsContainer.innerHTML = '';
        displayBlog(window.allBlogs[0]);
    }
}

// Auto-monitoring
let lastPostCount = 0;

function startMonitoring() {
    setInterval(async () => {
        try {
            const response = await fetch('https://api.github.com/repos/Isu-Patel/Milan_Rutu_Project/contents');
            const files = await response.json();
            const mdFiles = files.filter(f => f.name.endsWith('.md') && f.name !== 'README.md');
            
            if (lastPostCount > 0 && mdFiles.length > lastPostCount) {
                showNotification(mdFiles.length - lastPostCount);
            }
            lastPostCount = mdFiles.length;
        } catch (error) {
            console.log('Monitoring check failed:', error.message);
        }
    }, 30000);
}

function showNotification(count) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        🎉 ${count} new blog post${count > 1 ? 's' : ''} added! 
        <button onclick="this.parentElement.remove(); fetchBlogPosts();">Refresh</button>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.showingAll = false;
    fetchBlogPosts();
    startMonitoring();
});