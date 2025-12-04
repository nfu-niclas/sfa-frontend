import { createClient } from "@sanity/client";

export const client = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  useCdn: true,
  apiVersion: "2024-01-01",
});

// Bildehjelper
export function urlFor(source: any) {
  if (!source || !source.asset) {
    return {
      width: () => ({ height: () => ({ url: () => "" }), url: () => "" }),
      height: () => ({ url: () => "" }),
      url: () => "",
    };
  }

  const ref = source.asset._ref || source.asset._id || "";
  const [, assetId, dimensions, format] = ref.split("-");

  if (!assetId) {
    return {
      width: () => ({ height: () => ({ url: () => "" }), url: () => "" }),
      height: () => ({ url: () => "" }),
      url: () => "",
    };
  }

  const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
  const dataset = import.meta.env.PUBLIC_SANITY_DATASET;
  const baseUrl = `https://cdn.sanity.io/images/${projectId}/${dataset}/${assetId}-${dimensions}.${format}`;

return {
    width: (w: number) => ({
      height: (h: number) => ({
        url: () => `${baseUrl}?w=${w}&h=${h}&fit=crop&fm=webp&q=80`,
      }),
      url: () => `${baseUrl}?w=${w}&fm=webp&q=80`,
    }),
    height: (h: number) => ({
      url: () => `${baseUrl}?h=${h}&fm=webp&q=80`,
    }),
    url: () => `${baseUrl}?fm=webp&q=80`,
  };
}

// Hent alle artikler
export async function getArticles() {
  return await client.fetch(`
    *[_type == "article"] | order(publishedAt desc) {
      _id,
      title,
      displayTitle,
      shortTitle,
      slug,
      standfirst,
      mainImage,
      publishedAt,
      "authors": authors[]->{ _id, name, slug, image },
      "categories": categories[]->{ _id, title, slug },
      "tags": tags[]->{ _id, title, slug }
    }
  `);
}

// Hent én artikkel basert på slug
export async function getArticleBySlug(slug: string) {
  return await client.fetch(`
    *[_type == "article" && slug.current == $slug][0] {
      _id,
      title,
      displayTitle,
      shortTitle,
      slug,
      standfirst,
      mainImage,
      body,
      publishedAt,
      editorialUpdatedAt,
      "authors": authors[]->{ _id, name, slug, image, bio, email },
      "categories": categories[]->{ _id, title, slug },
      "tags": tags[]->{ _id, title, slug },
      "series": series->{ title, slug },
      seo
    }
  `, { slug });
}

// Hent alle forfattere
export async function getAuthors() {
  return await client.fetch(`
    *[_type == "author"] {
      _id,
      name,
      slug,
      image,
      bio,
      email
    }
  `);
}

// Hent alle kategorier
export async function getCategories() {
  return await client.fetch(`
    *[_type == "category"] {
      _id,
      title,
      slug
    }
  `);
}

// Hent lettlest-artikler
export async function getEasyReadArticles() {
  return await client.fetch(`
    *[_type == "article" && isEasyRead == true] | order(publishedAt desc) {
      _id,
      title,
      displayTitle,
      shortTitle,
      slug,
      standfirst,
      mainImage,
      publishedAt,
      "authors": authors[]->{ name, slug, image },
      "categories": categories[]->{ title, slug }
    }
  `);
}

// Søk i artikler
export async function searchArticles(searchTerm: string) {
  return await client.fetch(`
    *[_type == "article" && (
      title match $searchTerm + "*" ||
      displayTitle match $searchTerm + "*" ||
      standfirst match $searchTerm + "*"
    )] | order(publishedAt desc) {
      _id,
      title,
      displayTitle,
      shortTitle,
      slug,
      standfirst,
      mainImage,
      publishedAt,
      "authors": authors[]->{ name, slug, image },
      "categories": categories[]->{ title, slug }
    }
  `, { searchTerm });
}

// Hent alle kategorier med artikler
export async function getCategoriesWithArticles() {
  return await client.fetch(`
    *[_type == "category"] {
      _id,
      title,
      slug,
      "articleCount": count(*[_type == "article" && references(^._id)])
    }
  `);
}

// Hent artikler for en spesifikk kategori
export async function getArticlesByCategory(slug: string) {
  return await client.fetch(`
    *[_type == "article" && references(*[_type == "category" && slug.current == $slug]._id)] | order(publishedAt desc) {
      _id,
      title,
      displayTitle,
      shortTitle,
      slug,
      standfirst,
      mainImage,
      publishedAt,
      "authors": authors[]->{ name, slug, image },
      "categories": categories[]->{ title, slug }
    }
  `, { slug });
}

// Hent en spesifikk kategori
export async function getCategoryBySlug(slug: string) {
  return await client.fetch(`
    *[_type == "category" && slug.current == $slug][0] {
      _id,
      title,
      slug,
      description
    }
  `, { slug });
}

// Hent alle tags med artikler
export async function getTagsWithArticles() {
  return await client.fetch(`
    *[_type == "tag"] {
      _id,
      title,
      slug,
      "articleCount": count(*[_type == "article" && references(^._id)])
    }
  `);
}

// Hent artikler for en spesifikk tag
export async function getArticlesByTag(slug: string) {
  return await client.fetch(`
    *[_type == "article" && references(*[_type == "tag" && slug.current == $slug]._id)] | order(publishedAt desc) {
      _id,
      title,
      displayTitle,
      shortTitle,
      slug,
      standfirst,
      mainImage,
      publishedAt,
      "authors": authors[]->{ name, slug, image },
      "categories": categories[]->{ title, slug }
    }
  `, { slug });
}

// Hent en spesifikk tag
export async function getTagBySlug(slug: string) {
  return await client.fetch(`
    *[_type == "tag" && slug.current == $slug][0] {
      _id,
      title,
      slug
    }
  `, { slug });
}

// Hent relaterte artikler basert på kategorier og tags
export async function getRelatedArticles(currentSlug: string, categoryIds: string[], tagIds: string[], limit: number = 3) {
  const query = `*[_type == "article" && slug.current != $currentSlug && (
    count((categories[]._ref)[@ in $categoryIds]) > 0 ||
    count((tags[]._ref)[@ in $tagIds]) > 0
  )] | order(publishedAt desc) [0...$limit] {
    _id,
    title,
    displayTitle,
    slug,
    standfirst,
    publishedAt,
    mainImage,
    "categories": categories[]->{ _id, title, slug }
  }`;
  
  return client.fetch(query, { 
    currentSlug, 
    categoryIds, 
    tagIds, 
    limit 
  });
}

// Hent forfatter basert på slug
export async function getAuthorBySlug(slug: string) {
  return await client.fetch(`
    *[_type == "author" && slug.current == $slug][0] {
      _id,
      name,
      slug,
      image,
      bio,
      email
    }
  `, { slug });
}

// Hent alle artikler av en forfatter
export async function getArticlesByAuthor(authorId: string) {
  return await client.fetch(`
    *[_type == "article" && references($authorId)] | order(publishedAt desc) {
      _id,
      title,
      displayTitle,
      slug,
      standfirst,
      publishedAt,
      mainImage,
      "categories": categories[]->{ _id, title, slug }
    }
  `, { authorId });
}

// Hent alle forfattere med artikkelantall
export async function getAllAuthors() {
  return await client.fetch(`
    *[_type == "author"] | order(name asc) {
      _id,
      name,
      slug,
      image,
      bio,
      "articleCount": count(*[_type == "article" && references(^._id)])
    }
  `);
}

// Hent mest leste/nyeste artikler (for "Mest lest"-seksjon)
export async function getMostRecentArticles(limit: number = 5) {
  return await client.fetch(`
    *[_type == "article"] | order(publishedAt desc) [0...$limit] {
      _id,
      title,
      displayTitle,
      slug,
      publishedAt,
      mainImage
    }
  `, { limit });
}