import blogTailor from "@/assets/blog-tailor.jpg";
import blogFarmer from "@/assets/blog-farmer.jpg";
import blogTech from "@/assets/blog-tech.jpg";
import communityWomen from "@/assets/community-women.jpg";
import { ArrowRight, Calendar, Clock } from "lucide-react";

const articles = [
  {
    image: blogTailor,
    category: "Success Story",
    title: "How Mercy Turned a Single Sewing Machine Into a Thriving Tailoring Business",
    excerpt: "With a small loan from Demo Capital, Mercy Banda bought her first industrial sewing machine. Two years later, she employs two apprentices and serves customers from three districts. Her story is a testament to what happens when talent meets opportunity.",
    date: "February 15, 2026",
    readTime: "5 min read",
  },
  {
    image: blogFarmer,
    category: "Financial Tips",
    title: "5 Cash Flow Management Tips Every Small Business Owner Should Know",
    excerpt: "Managing cash flow is the lifeblood of any small business. In this article, we share practical tips that our financial literacy trainers teach entrepreneurs — from separating personal and business finances to building an emergency fund for your enterprise.",
    date: "January 28, 2026",
    readTime: "7 min read",
  },
  {
    image: blogTech,
    category: "Business Growth",
    title: "Why Now Is the Best Time to Invest in Your Small Business",
    excerpt: "The economic landscape is changing, and with it come new opportunities for small businesses. Learn why investing in your business today — whether through new stock, better equipment, or digital tools — can position you for long-term success.",
    date: "January 10, 2026",
    readTime: "6 min read",
  },
  {
    image: communityWomen,
    category: "Community",
    title: "The Power of Group Lending: How Women Entrepreneurs Are Supporting Each Other",
    excerpt: "Group lending isn't just about shared accountability — it's about building a community of support. Meet the women's business group in Lilongwe that has collectively borrowed from Demo and built a thriving network of mutual encouragement.",
    date: "December 20, 2025",
    readTime: "8 min read",
  },
];

const BlogSection = () => {
  return (
    <section id="blog" className="py-20 md:py-28 bg-warm" aria-labelledby="blog-heading">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-semibold text-sm tracking-wide uppercase">Insights & Stories</span>
          <h2 id="blog-heading" className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4 font-display">
            Stories, Tips & Insights for Growing Entrepreneurs
          </h2>
          <p className="text-muted-foreground text-lg font-body leading-relaxed">
            Stay informed with success stories from our clients, practical business tips, and insights on how to manage your finances and grow your enterprise. Knowledge is power — and we want to share it with you.
          </p>
        </div>

        {/* Featured Article */}
        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          <div className="rounded-2xl overflow-hidden shadow-elevated">
            <img src={articles[0].image} alt={articles[0].title} className="w-full h-[350px] md:h-full object-cover" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-kc-green font-semibold text-sm tracking-wide uppercase mb-2">{articles[0].category}</span>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground font-display mb-4 leading-tight">
              {articles[0].title}
            </h3>
            <p className="text-muted-foreground font-body leading-relaxed mb-4">
              {articles[0].excerpt}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground font-body mb-6">
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {articles[0].date}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {articles[0].readTime}</span>
            </div>
            <a href="#" className="text-primary font-semibold inline-flex items-center gap-2 hover:gap-3 transition-all font-body">
              Read Full Story <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Article Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.slice(1).map((article) => (
            <div key={article.title} className="bg-background rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow group">
              <div className="overflow-hidden">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-[220px] object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-6">
                <span className="text-kc-green font-semibold text-xs tracking-wide uppercase">{article.category}</span>
                <h4 className="text-lg font-bold text-foreground font-display mt-2 mb-3 leading-snug">
                  {article.title}
                </h4>
                <p className="text-muted-foreground text-sm font-body leading-relaxed mb-4 line-clamp-3">
                  {article.excerpt}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground font-body">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {article.date}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {article.readTime}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
