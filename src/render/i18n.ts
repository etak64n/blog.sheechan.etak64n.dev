// i18n: language type, locale strings, and the per-language text dictionary.
// Split out of render.ts so copy is separate from markup logic.

export type Lang = 'ja' | 'en'

export const SITE_DESCRIPTION =
  'AWS・Cloudflare・OpenAI・Anthropic の最新テックニュースを、しぃちゃんが毎日わかりやすくお届けするブログ'

export const SITE_DESCRIPTION_EN =
  'Daily, easy-to-read summaries of the latest AWS, Cloudflare, OpenAI and Anthropic news — by shiichan.'

export type Strings = {
  htmlLang: string
  siteName: string
  desc: string
  skip: string
  heroH1: string
  heroLede: string
  latestPosts: string
  popularWeek: [string, string]
  about: string
  aboutPanel: string
  aboutGreeting: string
  sources: string
  tags: string
  archive: string
  viewAll: string
  allTags: string
  allMonths: string
  more: string
  searchTitle: string
  searchPlaceholder: string
  searchAria: string
  searchPrompt: string
  searchHint: string
  searchNo: (q: string) => string
  hits: (n: number, q: string) => string
  tagsCount: (nTags: number, nPosts: number) => string
  postsCount: (n: number) => string
  monthsCount: (nMonths: number, nPosts: number) => string
  source: string
  listDesc: string
  colDate: string
  colSource: string
  colKind: string
  colPost: string
  colOriginal: string
  listAll: string
  notFoundBody: string
  footerTag: string
  footerRight: string
  rssDesc: string
  prev: string
  next: string
  toc: string
  related: string
}

export const T: Record<Lang, Strings> = {
  ja: {
    htmlLang: 'ja',
    siteName: 'しぃちゃんのテックブログ',
    desc: SITE_DESCRIPTION,
    skip: '本文へスキップ',
    heroH1: 'テックニュースを、わかりやすく。',
    heroLede:
      'しぃちゃんが、AWS・Cloudflare・OpenAI・Anthropic の最新ニュースを毎日チェックして、やさしくまとめてお届けするよ。むずかしい発表も、これを読めばだいじょうぶ！',
    latestPosts: 'Latest Posts',
    popularWeek: ['Popular', 'this week'],
    about: 'About',
    aboutPanel:
      'テックニュースが大好きな<b>しぃちゃん</b>が、毎日気になった発表をわかりやすく紹介するブログだよ。むずかしい話も、いっしょに読めばこわくない！',
    aboutGreeting:
      'やっほー、しぃちゃんだよ！毎日、AWS・Cloudflare・OpenAI・Anthropic といったテックの発表をチェックして、気になったニュースをわかりやすく紹介しているよ。',
    sources: 'Sources',
    tags: 'Tags',
    archive: 'Archive',
    viewAll: '全ての記事を見る',
    allTags: 'ALL TAGS',
    allMonths: 'ALL MONTHS',
    more: 'MORE',
    searchTitle: 'SEARCH',
    searchPlaceholder: 'キーワードで検索',
    searchAria: '記事を検索',
    searchPrompt: 'TYPE KEYWORDS TO SEARCH',
    searchHint: 'タイトル・本文からキーワードで探せるよ。スペース区切りで AND 検索になるからね。',
    searchNo: (q) => `「${q}」に合う記事は見つからなかったよ。別のキーワードでも試してみてね。`,
    hits: (n, q) => `${n} 件ヒット &mdash; 「${q}」`,
    tagsCount: (nt, np) => `${nt} TAGS / ${np} POSTS`,
    postsCount: (n) => `${n} 件`,
    monthsCount: (nm, np) => `${nm} ヶ月 / ${np} 件`,
    source: '原文',
    listDesc: '全記事の一覧。しぃちゃんの記事と元記事へのリンクつき。',
    colDate: '日付',
    colSource: 'ソース',
    colKind: '種別',
    colPost: 'しぃちゃんの記事',
    colOriginal: '元の記事',
    listAll: 'すべて表示',
    notFoundBody: 'ごめんね、このページは見つからなかったよ。',
    footerTag: 'shiichan blog — daily tech news, written by shiichan',
    footerRight: '毎日更新',
    rssDesc: SITE_DESCRIPTION,
    prev: '前へ',
    next: '次へ',
    toc: '目次',
    related: '関連記事',
  },
  en: {
    htmlLang: 'en',
    siteName: 'Shiichan Tech Blog',
    desc: SITE_DESCRIPTION_EN,
    skip: 'Skip to content',
    heroH1: 'Tech news, made simple.',
    heroLede:
      'shiichan checks the latest AWS, Cloudflare, OpenAI and Anthropic announcements every day and sums them up in plain language. Even the tricky ones — you’ve got this!',
    latestPosts: 'Latest Posts',
    popularWeek: ['Popular', 'this week'],
    about: 'About',
    aboutPanel:
      '<b>shiichan</b> loves tech news and rounds up the announcements she finds interesting, in plain language, every day. Even the hard stuff is friendlier when we read it together!',
    aboutGreeting:
      'Hi, I’m shiichan! Every day I check tech announcements from AWS, Cloudflare, OpenAI and Anthropic, and write up the ones I find interesting in plain, easy-to-read English.',
    sources: 'Sources',
    tags: 'Tags',
    archive: 'Archive',
    viewAll: 'View all posts',
    allTags: 'ALL TAGS',
    allMonths: 'ALL MONTHS',
    more: 'MORE',
    searchTitle: 'SEARCH',
    searchPlaceholder: 'Search by keyword',
    searchAria: 'Search articles',
    searchPrompt: 'TYPE KEYWORDS TO SEARCH',
    searchHint: 'Search titles and body text. Space-separated terms are matched with AND.',
    searchNo: (q) => `No articles matched “${q}”. Try a different keyword.`,
    hits: (n, q) => `${n} HIT${n === 1 ? '' : 'S'} FOR &ldquo;${q}&rdquo;`,
    tagsCount: (nt, np) => `${nt} TAGS / ${np} POSTS`,
    postsCount: (n) => `${n} POST${n === 1 ? '' : 'S'}`,
    monthsCount: (nm, np) => `${nm} MONTH${nm === 1 ? '' : 'S'} / ${np} POSTS`,
    source: 'Source',
    listDesc: 'Every post at a glance, linking both the shiichan write-up and the original.',
    colDate: 'Date',
    colSource: 'Source',
    colKind: 'Type',
    colPost: "Shii's post",
    colOriginal: 'Original',
    listAll: 'All',
    notFoundBody: 'Sorry, this page could not be found.',
    footerTag: 'shiichan blog — daily tech news, written by shiichan',
    footerRight: 'Daily updates',
    rssDesc: SITE_DESCRIPTION_EN,
    prev: 'Prev',
    next: 'Next',
    toc: 'Contents',
    related: 'Related posts',
  },
}
