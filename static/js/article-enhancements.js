(() => {
    const normalize = (value) => (value || "").replace(/[\u2019]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
    const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const stripInlineMarkdown = (value) => (value || "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*_`~]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const faqHeadings = new Set([
        "frequently asked questions",
        "faq",
        "common questions",
        "quick answers",
        "reader questions",
        "more questions"
    ]);
    const bottomLineHeadings = new Set([
        "the bottom line",
        "final take",
        "the practical answer",
        "what we'd do"
    ]);
    const finalRecommendationHeadings = new Set([
        "final recommendation",
        "our recommendation",
        "buyer-fit verdict",
        "should you consider it?",
        "worth it or not?",
        "verdict",
        "final verdict",
        "which one fits better?",
        "the better fit",
        "decision takeaway"
    ]);
    const editorNoteHeadings = new Set([
        "editor's note",
        "our final note",
        "one last thought",
        "closing perspective"
    ]);
    const closingCalloutHeadings = new Set([
        ...bottomLineHeadings,
        ...finalRecommendationHeadings,
        ...editorNoteHeadings,
        "which pick fits which buyer",
        "the practical shortlist",
        "closing take"
    ]);
    const addCalloutEyebrow = (wrapper, label = "Editor's Note") => {
        if (!wrapper || wrapper.querySelector(":scope > .callout-eyebrow")) {
            return;
        }

        const eyebrow = document.createElement("span");
        eyebrow.className = "callout-eyebrow";
        eyebrow.textContent = label;
        wrapper.insertBefore(eyebrow, wrapper.firstChild);
    };
    const dedupeSummaryFromBody = () => {
        const summary = document.querySelector(".article-summary p");
        const articleBody = document.querySelector(".article-body");
        if (!summary || !articleBody) {
            return;
        }

        const firstParagraph = Array.from(articleBody.children).find(
            (node) => node.tagName === "P" && normalize(node.textContent).length > 0
        );

        if (!firstParagraph) {
            return;
        }

        if (normalize(summary.textContent) === normalize(firstParagraph.textContent)) {
            firstParagraph.remove();
        }
    };

    const repairMarkdownHeadingParagraphs = (articleBody) => {
        Array.from(articleBody.querySelectorAll("p")).forEach((node) => {
            if (node.closest(".faq-section, .faq-list, .section-product-cta, .bottom-line-callout, .table-of-contents")) {
                return;
            }

            const match = (node.textContent || "").trim().match(/^(#{2,4})\s+(.+)$/);
            if (!match) {
                return;
            }

            const heading = document.createElement(`h${Math.min(match[1].length, 4)}`);
            heading.textContent = stripInlineMarkdown(match[2]);
            node.replaceWith(heading);
        });
    };

    const collectSectionNodes = (heading) => {
        const nodes = [];
        let current = heading.nextSibling;
        while (current) {
            if (current.nodeType === Node.ELEMENT_NODE && /^H2$/i.test(current.tagName)) {
                break;
            }

            const next = current.nextSibling;
            nodes.push(current);
            current = next;
        }

        return nodes;
    };

    const collectFaqSectionNodes = (heading) => {
        const section = heading.closest(".article-section");
        if (section) {
            const nodes = [];
            let current = heading.nextSibling;
            while (current) {
                const next = current.nextSibling;
                nodes.push(current);
                current = next;
            }

            current = section.nextElementSibling;
            while (current) {
                const next = current.nextElementSibling;
                nodes.push(current);
                current = next;
            }

            return nodes;
        }

        const nodes = [];
        let current = heading.nextSibling;
        while (current) {
            const next = current.nextSibling;
            nodes.push(current);
            current = next;
        }

        return nodes;
    };

    const hasMeaningfulContent = (node) =>
        node.nodeType === Node.ELEMENT_NODE
            || (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0);

    const isFaqQuestionParagraph = (node) => {
        if (!node || node.nodeType !== Node.ELEMENT_NODE || node.tagName !== "P") {
            return false;
        }

        if (node.querySelector("a, img, table, ul, ol, blockquote")) {
            return false;
        }

        const text = stripInlineMarkdown(node.textContent || "");
        if (!text || text.length > 180 || !text.endsWith("?")) {
            return false;
        }

        const onlySimpleInlineChildren = Array.from(node.childNodes).every((child) =>
            child.nodeType === Node.TEXT_NODE
                ? !child.textContent.trim() || text.includes(child.textContent.trim())
                : child.nodeType === Node.ELEMENT_NODE && /^(STRONG|B|EM|SPAN)$/i.test(child.tagName));

        return onlySimpleInlineChildren || text.split(/\s+/).filter(Boolean).length <= 18;
    };

    const isFaqQuestionNode = (node) =>
        node?.nodeType === Node.ELEMENT_NODE
        && (/^H[23]$/i.test(node.tagName) || isFaqQuestionParagraph(node));

    const getFaqQuestionNode = (node) => {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) {
            return null;
        }

        if (isFaqQuestionNode(node)) {
            return node;
        }

        if (node.classList?.contains("article-section")) {
            return Array.from(node.children).find(isFaqQuestionNode) || null;
        }

        return null;
    };

    const extractFaqQuestionText = (node) => stripInlineMarkdown(node?.textContent || "");

    const enhanceFaq = (heading) => {
        if (!heading || heading.dataset.enhancedFaq === "true") {
            return;
        }

        const sectionNodes = collectFaqSectionNodes(heading).filter(hasMeaningfulContent);
        const questionNodes = sectionNodes
            .map(getFaqQuestionNode)
            .filter(Boolean);

        if (questionNodes.length === 0) {
            return;
        }

        const section = document.createElement("details");
        section.className = "faq-section";
        section.removeAttribute("open");
        if (heading.id) {
            section.id = heading.id;
        }

        const sectionSummary = document.createElement("summary");
        sectionSummary.textContent = heading.textContent.trim();

        const sectionContent = document.createElement("div");
        sectionContent.className = "faq-section__content";

        const wrapper = document.createElement("div");
        wrapper.className = "faq-list";

        sectionContent.appendChild(wrapper);
        section.append(sectionSummary, sectionContent);
        heading.replaceWith(section);

        let currentItem = null;
        let currentAnswer = null;

        sectionNodes.forEach((node) => {
            const questionNode = getFaqQuestionNode(node);
            if (questionNode) {
                currentItem = document.createElement("details");
                currentItem.className = "faq-item";
                currentItem.removeAttribute("open");

                const summary = document.createElement("summary");
                summary.textContent = extractFaqQuestionText(questionNode);

                currentAnswer = document.createElement("div");
                currentAnswer.className = "faq-answer";

                currentItem.append(summary, currentAnswer);
                wrapper.appendChild(currentItem);
                if (node.classList?.contains("article-section")) {
                    questionNode.remove();
                    Array.from(node.childNodes).forEach((child) => currentAnswer.appendChild(child));
                }

                node.remove();
                return;
            }

            if (currentAnswer) {
                currentAnswer.appendChild(node);
            }
        });

        section.dataset.enhancedFaq = "true";
    };

    const enhanceFaqSections = (articleBody) => {
        articleBody.querySelectorAll("h2").forEach((heading) => {
            const text = normalize(heading.textContent);
            if (faqHeadings.has(text)) {
                enhanceFaq(heading);
            }
        });
    };

    const enhanceWrappedFaqSections = (articleBody) => {
        const heading = Array.from(articleBody.querySelectorAll(".article-section > h2"))
            .find((node) => faqHeadings.has(normalize(node.textContent)));
        const faqSection = heading?.closest(".article-section");
        if (!heading || !faqSection || faqSection.dataset.enhancedFaq === "true" || faqSection.querySelector(".faq-section")) {
            return;
        }

        const questionSections = [];
        let current = faqSection.nextElementSibling;
        while (current?.classList?.contains("article-section")) {
            const question = getFaqQuestionNode(current);
            if (question) {
                questionSections.push({ section: current, question });
            }

            current = current.nextElementSibling;
        }

        if (questionSections.length === 0) {
            return;
        }

        const section = document.createElement("details");
        section.className = "faq-section";
        section.removeAttribute("open");
        if (heading.id) {
            section.id = heading.id;
        }

        const sectionSummary = document.createElement("summary");
        sectionSummary.textContent = heading.textContent.trim();

        const sectionContent = document.createElement("div");
        sectionContent.className = "faq-section__content";

        const wrapper = document.createElement("div");
        wrapper.className = "faq-list";
        sectionContent.appendChild(wrapper);
        section.append(sectionSummary, sectionContent);

        faqSection.parentNode.insertBefore(section, faqSection);
        faqSection.remove();

        questionSections.forEach(({ section: questionSection, question }) => {
            const item = document.createElement("details");
            item.className = "faq-item";
            item.removeAttribute("open");

            const summary = document.createElement("summary");
            summary.textContent = extractFaqQuestionText(question);

            const answer = document.createElement("div");
            answer.className = "faq-answer";

            question.remove();
            Array.from(questionSection.childNodes).forEach((child) => answer.appendChild(child));
            item.append(summary, answer);
            wrapper.appendChild(item);
            questionSection.remove();
        });
    };

    const enhanceBottomLine = (heading) => {
        if (!heading) {
            return;
        }

        if (heading.parentElement?.classList.contains("bottom-line-callout")) {
            addCalloutEyebrow(heading.parentElement);
            return;
        }

        const sectionNodes = collectSectionNodes(heading).filter(hasMeaningfulContent);
        const wrapper = document.createElement("div");
        wrapper.className = "bottom-line-callout";
        heading.parentNode.insertBefore(wrapper, heading);
        addCalloutEyebrow(wrapper);
        wrapper.appendChild(heading);

        sectionNodes.forEach((node) => wrapper.appendChild(node));
    };

    const removeInlineAffiliateArtifacts = (articleBody) => {
        articleBody.querySelectorAll(".article-affiliate-cta").forEach((node) => node.remove());
        articleBody.querySelectorAll("p").forEach((node) => {
            const text = normalize(node.textContent);
            if (text.startsWith("affiliate disclosure:")
                || text.includes("clean floor lab may earn from qualifying purchases")) {
                node.remove();
            }
        });
    };

    const readProducts = () => {
        const script = document.querySelector("#article-products-data");
        if (!script) {
            return [];
        }

        try {
    let value = JSON.parse(script.textContent || "[]");
    if (typeof value === "string") {
        value = JSON.parse(value);
    }
    return Array.isArray(value) ? value.filter((product) => product && product.name && product.amazon_url) : [];
        } catch {
            return [];
        }
    };

    const readBrowseProduct = () => {
        const script = document.querySelector("#article-browse-product-data");
        if (!script) {
            return null;
        }

        try {
            let value = JSON.parse(script.textContent || "null");
            if (typeof value === "string") {
                value = JSON.parse(value);
            }

            return isUsableBrowseProduct(value) ? value : null;
        } catch {
            return null;
        }
    };

    const browseProductBlockedMarkers = [
        "software",
        "crm",
        "saas",
        "platform",
        "subscription",
        "service",
        "services",
        "app",
        "apps",
        "system",
        "systems",
        "payroll",
        "accounting",
        "bookkeeping",
        "invoicing",
        "scheduling",
        "booking",
        "workflow",
        "template",
        "templates",
        "certificate",
        "career",
        "resume",
        "interview",
        "salary"
    ];

    const isUsableBrowseProduct = (value) => {
        if (!value?.name || !value?.amazon_url) {
            return false;
        }

        const name = normalize(value.name);
        if (!name || name.length > 48) {
            return false;
        }

        if (browseProductBlockedMarkers.some((marker) => name.includes(marker))) {
            return false;
        }

        const title = normalize(document.querySelector("h1")?.textContent || "");
        if (title && browseProductBlockedMarkers.some((marker) => title.includes(marker))) {
            return false;
        }

        return true;
    };

    const enhanceRoundupHero = (article, products) => {
        if (!article || products.length <= 1) {
            return;
        }

        const summary = article.querySelector(".article-summary");
        const topPick = products[0];
        if (!summary || !topPick?.name || !topPick?.amazon_url) {
            return;
        }

        const summaryText = summary.querySelector("p")?.textContent?.trim() || "";
        summary.removeAttribute("itemprop");
        summary.className = "roundup-hero-callout";
        summary.textContent = "";

        const content = document.createElement("div");
        content.className = "roundup-hero-callout__content";

        const eyebrow = document.createElement("span");
        eyebrow.className = "callout-eyebrow";
        eyebrow.textContent = "Best Overall";

        const productName = document.createElement("p");
        productName.className = "roundup-hero-callout__product";
        const productLink = document.createElement("a");
        productLink.href = topPick.amazon_url;
        productLink.target = "_blank";
        productLink.rel = "nofollow sponsored noopener";
        productLink.textContent = topPick.name;
        productName.appendChild(productLink);

        content.append(eyebrow, productName);

        const action = document.createElement("div");
        action.className = "roundup-hero-callout__action";

        const link = document.createElement("a");
        link.href = topPick.amazon_url;
        link.target = "_blank";
        link.rel = "nofollow sponsored noopener";
        link.className = "button-link amazon-button";
        link.textContent = "Check price on Amazon";
        action.appendChild(link);
        content.appendChild(action);

        if (summaryText) {
            const body = document.createElement("p");
            body.className = "roundup-hero-callout__summary";
            body.setAttribute("itemprop", "description");
            body.textContent = summaryText;
            content.appendChild(body);
        }

        summary.appendChild(content);
    };

    const createAffiliateCta = (modifier) => {
        const template = document.querySelector("#article-affiliate-cta-template");
        const source = template?.content?.firstElementChild;
        if (!source) {
            return null;
        }

        const clone = source.cloneNode(true);
        if (modifier) {
            clone.classList.add(modifier);
        }

        return clone;
    };

    const createBrowseCta = (product, modifier) => {
        if (!product?.name || !product?.amazon_url) {
            return null;
        }

        const wrapper = document.createElement("div");
        wrapper.className = "affiliate-cta";
        if (document.body.classList.contains("theme-minimal")) wrapper.classList.add("minimal-cta");
        if (document.body.classList.contains("theme-lab")) wrapper.classList.add("lab-cta");
        if (document.body.classList.contains("theme-modern")) wrapper.classList.add("modern-cta");
        if (document.body.classList.contains("theme-bold")) wrapper.classList.add("bold-cta");
        if (document.body.classList.contains("theme-editorial")) wrapper.classList.add("editorial-cta");
        if (document.body.classList.contains("theme-catalog")) wrapper.classList.add("catalog-cta");
        if (document.body.classList.contains("theme-digest")) wrapper.classList.add("digest-cta");
        if (document.body.classList.contains("theme-fieldguide")) wrapper.classList.add("fieldguide-cta");
        if (document.body.classList.contains("theme-directory")) wrapper.classList.add("directory-cta");
        if (modifier) {
            wrapper.classList.add(modifier);
        }

        const title = document.createElement("strong");
        title.textContent = product.name;
        wrapper.appendChild(title);

        const action = document.createElement("div");
        action.className = "affiliate-cta__action";

        const link = document.createElement("a");
        link.href = product.amazon_url;
        link.target = "_blank";
        link.rel = "nofollow sponsored noopener";
        link.className = "button-link amazon-button";
        link.textContent = product.cta_text || `Browse ${product.name} on Amazon`;
        action.appendChild(link);

        const note = document.createElement("p");
        note.className = "affiliate-note";
        note.innerHTML = "<em>As an Amazon Associate, we may earn from qualifying purchases.</em>";
        action.appendChild(note);

        wrapper.appendChild(action);
        return wrapper;
    };

    const createProductLinksCta = (products, modifier, headingText) => {
        const usableProducts = products
            .filter((product) => product?.name && product?.amazon_url)
            .slice(0, 5);
        if (usableProducts.length === 0) {
            return null;
        }

        const wrapper = document.createElement("div");
        wrapper.className = "affiliate-cta";
        if (document.body.classList.contains("theme-minimal")) wrapper.classList.add("minimal-cta");
        if (document.body.classList.contains("theme-lab")) wrapper.classList.add("lab-cta");
        if (document.body.classList.contains("theme-modern")) wrapper.classList.add("modern-cta");
        if (document.body.classList.contains("theme-bold")) wrapper.classList.add("bold-cta");
        if (document.body.classList.contains("theme-editorial")) wrapper.classList.add("editorial-cta");
        if (document.body.classList.contains("theme-catalog")) wrapper.classList.add("catalog-cta");
        if (document.body.classList.contains("theme-digest")) wrapper.classList.add("digest-cta");
        if (document.body.classList.contains("theme-fieldguide")) wrapper.classList.add("fieldguide-cta");
        if (document.body.classList.contains("theme-directory")) wrapper.classList.add("directory-cta");
        modifier.split(/\s+/).filter(Boolean).forEach((className) => wrapper.classList.add(className));

        const copy = document.createElement("div");
        const label = document.createElement("p");
        label.className = "cta-label";
        label.textContent = usableProducts.length === 1 ? "Product link" : "Product links";
        const title = document.createElement("strong");
        title.textContent = headingText;
        copy.append(label, title);

        const action = document.createElement("div");
        action.className = "affiliate-cta__action";
        usableProducts.forEach((product) => {
            const link = document.createElement("a");
            link.href = product.amazon_url;
            link.target = "_blank";
            link.rel = "nofollow sponsored noopener";
            link.className = "button-link amazon-button";
            link.textContent = usableProducts.length === 1
                ? "Check price on Amazon"
                : `View ${product.name} on Amazon`;
            action.appendChild(link);
        });

        const note = document.createElement("p");
        note.className = "affiliate-note";
        note.innerHTML = "<em>As an Amazon Associate, we may earn from qualifying purchases.</em>";
        action.appendChild(note);
        wrapper.append(copy, action);
        return wrapper;
    };

    const insertNodeAfterSection = (heading, node) => {
        if (!heading) {
            return;
        }

        const sectionNodes = collectSectionNodes(heading).filter(hasMeaningfulContent);
        const anchor = sectionNodes.length > 0 ? sectionNodes[sectionNodes.length - 1] : heading;
        anchor.parentNode.insertBefore(node, anchor.nextSibling);
    };

    const insertAfterSection = (heading, modifier) => {
        const cta = createAffiliateCta(modifier);
        if (!cta) {
            return;
        }

        insertNodeAfterSection(heading, cta);
    };

    const placeBrowseHeroCta = (article, product) => {
        if (!article || article.querySelector(".affiliate-cta--hero, .review-verdict-card")) {
            return;
        }

        const cta = createBrowseCta(product, "affiliate-cta--hero");
        if (!cta) {
            return;
        }

        const anchor = article.querySelector(".disclosure-inline")
            || article.querySelector(".article-summary, .article-standfirst")
            || article.querySelector(".article-header");
        if (!anchor?.parentNode) {
            return;
        }

        anchor.parentNode.insertBefore(cta, anchor.nextSibling);
    };

    const placeBrowseClosingCta = (articleBody, product) => {
        const headings = candidateSectionHeadings(articleBody);
        if (headings.length === 0) {
            return;
        }

        const closingHeading = headings.find((heading) => closingCalloutHeadings.has(normalize(heading.textContent)))
            || headings[headings.length - 1];
        if (!closingHeading) {
            return;
        }

        const cta = createBrowseCta(product, "affiliate-cta--post-editor");
        if (!cta) {
            return;
        }

        insertNodeAfterSection(closingHeading, cta);
    };

    const candidateSectionHeadings = (articleBody) =>
        Array.from(articleBody.querySelectorAll("h2")).filter((heading) => {
            const text = normalize(heading.textContent);
            return !faqHeadings.has(text);
        });

    const ensureProductHeroCta = (article, products) => {
        if (!article || products.length === 0
            || article.querySelector(".affiliate-cta--hero, .review-verdict-card, .roundup-hero-callout")) {
            return;
        }

        const cta = createProductLinksCta(products, "affiliate-cta--hero", "Compare the current Amazon listings");
        const anchor = article.querySelector(".disclosure-inline");
        if (cta && anchor?.parentNode) {
            anchor.parentNode.insertBefore(cta, anchor.nextSibling);
        }
    };

    const ensureProductMidCta = (articleBody, products) => {
        if (products.length !== 1
            || articleBody.querySelector(".affiliate-cta--mid, .section-product-cta")) {
            return;
        }

        const headings = candidateSectionHeadings(articleBody);
        if (headings.length === 0) {
            return;
        }

        const product = products[0];
        const cta = createProductLinksCta([product], "affiliate-cta--mid", product.name);
        if (cta) {
            insertNodeAfterSection(headings[Math.floor(headings.length / 2)], cta);
        }
    };

    const ensureProductClosingCta = (articleBody, products, headingText) => {
        if (products.length === 0
            || articleBody.querySelector(".affiliate-cta--post-editor, .affiliate-cta--verdict")) {
            return;
        }

        const cta = createProductLinksCta(products, "affiliate-cta--post-editor", headingText);
        if (cta) {
            articleBody.appendChild(cta);
        }
    };

    const commercialGuideMarkers = [
        "best ",
        "before you buy",
        "buying checklist",
        "buying consideration",
        "buying guide",
        "buying tip",
        "how to choose",
        "review",
        "worth upgrading",
        "what to check",
        "what to look for",
        "which one should you buy",
        "which vacuum",
        "which robot vacuum"
    ];

    const isCommercialGuideArticle = (article) => {
        if (article?.dataset.contentType !== "guide") {
            return false;
        }

        if (article.dataset.reviewFraming === "structured_commercial_analysis") {
            return true;
        }

        const title = normalize(article.querySelector("h1")?.textContent || "");
        return commercialGuideMarkers.some((marker) => title.includes(marker));
    };

    const ensureGuideShopperNextStep = (articleBody) => {
        if (articleBody.querySelector(".shopper-next-step")) {
            return;
        }

        const headings = candidateSectionHeadings(articleBody);
        if (headings.length === 0) {
            return;
        }

        const wrapper = document.createElement("div");
        wrapper.className = "affiliate-cta shopper-next-step";

        const copy = document.createElement("div");
        const label = document.createElement("p");
        label.className = "cta-label";
        label.textContent = "Shopper next step";
        const title = document.createElement("strong");
        title.textContent = "Compare the models that fit these buying criteria";
        copy.append(label, title);

        const action = document.createElement("div");
        action.className = "affiliate-cta__action";
        const link = document.createElement("a");
        link.href = "/best/";
        link.className = "button-link";
        link.textContent = "See current product picks";
        action.appendChild(link);

        wrapper.append(copy, action);
        insertNodeAfterSection(headings[Math.floor(headings.length / 2)], wrapper);
    };

    const placeContextualCtas = (articleBody) => {
        const headings = candidateSectionHeadings(articleBody);
        if (headings.length === 0) {
            return;
        }

        const editorHeading = headings.find((heading) => editorNoteHeadings.has(normalize(heading.textContent)));
        if (editorHeading) {
            insertAfterSection(editorHeading, "affiliate-cta--post-editor");
        }

        const midCandidates = headings.filter((heading) => {
            const text = normalize(heading.textContent);
            return !editorNoteHeadings.has(text) && !bottomLineHeadings.has(text);
        });
        if (midCandidates.length === 0) {
            return;
        }

        const midIndex = Math.max(0, Math.floor(midCandidates.length / 2));
        insertAfterSection(midCandidates[midIndex], "affiliate-cta--mid");
    };

    const placeVerdictCta = (articleBody) => {
        const verdictHeading = Array.from(articleBody.querySelectorAll("h2")).find((heading) => {
            const text = normalize(heading.textContent);
            return finalRecommendationHeadings.has(text) || bottomLineHeadings.has(text);
        });
        if (!verdictHeading) {
            return;
        }

        const wrapper = verdictHeading.closest(".bottom-line-callout");
        if (!wrapper || wrapper.querySelector(".affiliate-cta")) {
            return;
        }

        const cta = createAffiliateCta("affiliate-cta--verdict");
        if (!cta) {
            return;
        }

        wrapper.appendChild(cta);
    };

    const createRoundupSectionCta = (product) => {
        if (!product?.amazon_url) {
            return null;
        }

        const wrapper = document.createElement("div");
        wrapper.className = "section-product-cta";
        wrapper.dataset.productName = normalize(product.name);

        const link = document.createElement("a");
        link.href = product.amazon_url;
        link.target = "_blank";
        link.rel = "nofollow sponsored noopener";
        link.className = "button-link amazon-button";
        link.textContent = "Check price on Amazon";
        wrapper.appendChild(link);
        return wrapper;
    };

    const removeLegacyRoundupBlocks = (articleBody) => {
        articleBody.querySelectorAll(".product-recommendations").forEach((node) => node.remove());
        articleBody.querySelectorAll(".section-product-cta").forEach((node) => node.remove());
        articleBody.querySelectorAll("li").forEach((node) => {
            if (normalize(node.textContent).startsWith("amazon listing:")) {
                node.remove();
            }
        });
        articleBody.querySelectorAll("p").forEach((node) => {
            const links = Array.from(node.querySelectorAll("a"));
            if (links.length === 1
                && /amazon\.com/i.test(links[0].href)
                && normalize(node.textContent) === "check price on amazon") {
                node.remove();
            }
        });
    };

    const placeRoundupSectionCtas = (articleBody, products) => {
        const headings = candidateSectionHeadings(articleBody);
        if (headings.length === 0 || products.length === 0) {
            return;
        }

        const product = products[Math.floor(products.length / 2)];
        const productKey = normalize(product.name);
        const heading = headings.find((candidate) => normalize(candidate.textContent).includes(productKey));
        if (!heading) {
            return;
        }

        const sectionNodes = collectSectionNodes(heading).filter(hasMeaningfulContent);
        const existingCta = sectionNodes.find((node) =>
            node.nodeType === Node.ELEMENT_NODE
            && node.classList?.contains("section-product-cta"));
        if (existingCta) {
            return;
        }

        const cta = createRoundupSectionCta(product);
        if (cta) {
            insertNodeAfterSection(heading, cta);
        }
    };

    const shouldSkipInlineLinkNode = (node) => {
        const parent = node.parentElement;
        if (!parent) {
            return true;
        }

        if (parent.closest("a, button, summary, .affiliate-cta, .review-verdict-card, .faq-list, .table-of-contents")) {
            return true;
        }

        return !parent.closest("p, li, td, blockquote");
    };

    const linkFirstMentionInElement = (element, productName, productUrl) => {
        if (!element) {
            return false;
        }

        const matcher = new RegExp(escapeRegExp(productName), "i");
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const value = node.textContent || "";
                if (!value.trim() || shouldSkipInlineLinkNode(node) || !matcher.test(value)) {
                    return NodeFilter.FILTER_SKIP;
                }

                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const node = walker.nextNode();
        if (!node) {
            return false;
        }

        const text = node.textContent || "";
        const match = text.match(matcher);
        if (!match || typeof match.index !== "number") {
            return false;
        }

        const before = text.slice(0, match.index);
        const label = text.slice(match.index, match.index + match[0].length);
        const after = text.slice(match.index + match[0].length);
        const fragment = document.createDocumentFragment();

        if (before) {
            fragment.appendChild(document.createTextNode(before));
        }

        const link = document.createElement("a");
        link.href = productUrl;
        link.target = "_blank";
        link.rel = "nofollow sponsored noopener";
        link.className = "affiliate-inline-link";
        link.textContent = label;
        fragment.appendChild(link);

        if (after) {
            fragment.appendChild(document.createTextNode(after));
        }

        node.parentNode.replaceChild(fragment, node);
        return true;
    };

    const linkFirstMentionsPerSection = (article, articleBody) => {
        const productName = article.dataset.primaryProductName;
        const productUrl = article.dataset.primaryProductUrl;
        if (!productName || !productUrl) {
            return;
        }

        candidateSectionHeadings(articleBody).forEach((heading) => {
            const sectionNodes = collectSectionNodes(heading).filter(
                (node) => node.nodeType === Node.ELEMENT_NODE);
            sectionNodes.some((node) => linkFirstMentionInElement(node, productName, productUrl));
        });
    };

    const linkLeadMentions = (article, articleBody) => {
        const productName = article.dataset.primaryProductName;
        const productUrl = article.dataset.primaryProductUrl;
        if (!productName || !productUrl) {
            return;
        }

        const summary = article.querySelector(".article-summary, .article-standfirst");
        if (summary) {
            linkFirstMentionInElement(summary, productName, productUrl);
        }

        const leadParagraph = Array.from(articleBody.children).find((node) =>
            node.tagName === "P" && normalize(node.textContent).length > 0);
        if (leadParagraph) {
            linkFirstMentionInElement(leadParagraph, productName, productUrl);
        }
    };

    const linkProductMentions = (articleBody, products) => {
        products.forEach((product) => {
            const candidates = Array.from(articleBody.querySelectorAll("p, li, blockquote, td"));
            candidates.some((node) => linkFirstMentionInElement(node, product.name, product.amazon_url));
        });
    };

    const enhanceComparisonTable = (articleBody, products) => {
        const table = articleBody.querySelector("table");
        if (!table || products.length === 0) {
            return;
        }

        products.forEach((product) => {
            linkFirstMentionInElement(table, product.name, product.amazon_url);
        });

        const noteHost = table.closest(".table-scroll") ?? table;
        const next = noteHost.nextElementSibling;
        if (next?.classList.contains("comparison-table-note")) {
            return;
        }

        const note = document.createElement("p");
        note.className = "affiliate-note comparison-table-note";
        note.innerHTML = "<em>Affiliate note: product links in this comparison table may earn us a commission from qualifying purchases.</em>";
        noteHost.parentNode.insertBefore(note, noteHost.nextSibling);
    };

    const readUtilitySpec = (root) => {
        const script = root?.querySelector("[data-tool-spec]");
        if (!script) {
            return { error: "missing_spec" };
        }

        try {
            const spec = JSON.parse(script.textContent || "null");
            return validateUtilitySpec(spec);
        } catch {
            return { error: "invalid_json" };
        }
    };

    const validateUtilitySpec = (spec) => {
        if (!spec || !Array.isArray(spec.inputs) || spec.inputs.length === 0) {
            return { error: "missing_inputs" };
        }

        const genericText = [
            spec.title,
            spec.dek,
            spec.result_label,
            ...(spec.inputs || []).map((input) => input.label),
            ...(spec.results || []).flatMap((result) => [result.title, result.body])
        ].join(" ").toLowerCase();

        if (
            genericText.includes("tool calculator") ||
            genericText.includes("estimate the practical total") ||
            genericText.includes("rough planning number") ||
            (spec.inputs || []).some((input) => ["quantity", "unit value", "buffer"].includes(String(input.label || "").toLowerCase()))
        ) {
            return { error: "generic_fallback_spec" };
        }

        const resultKeys = new Set((spec.results || []).map((result) => result.key).filter(Boolean));
        if (spec.kind === "picker") {
            const valid = spec.formula === "weighted_choice"
                && spec.inputs.length >= 4
                && spec.inputs.every((input) =>
                    input.type === "select" &&
                    Array.isArray(input.options) &&
                    input.options.length >= 2 &&
                    input.options.every((option) =>
                        option.result &&
                        resultKeys.has(option.result) &&
                        toNumber(option.weight, 0) >= 1));
            return valid ? spec : { error: "invalid_picker_spec" };
        }

        if (spec.kind === "checklist") {
            const valid = spec.formula === "readiness_score"
                && spec.inputs.length >= 5
                && spec.inputs.every((input) => input.type === "checkbox")
                && ["low", "medium", "high"].every((key) => resultKeys.has(key));
            return valid ? spec : { error: "invalid_checklist_spec" };
        }

        if (spec.kind === "calculator") {
            const keys = new Set(spec.inputs.map((input) => input.key));
            const required = {
                room_area: ["width", "length", "ceiling"],
                cost_range: ["quantity", "unit_cost", "labor_hours", "hourly_rate", "contingency"],
                weighted_total: ["quantity", "unit_value", "buffer"]
            }[spec.formula];
            const valid = required
                && spec.inputs.every((input) => input.type === "number")
                && required.every((key) => keys.has(key));
            return valid ? spec : { error: "invalid_calculator_spec" };
        }

        return { error: "unknown_tool_kind" };
    };

    const toNumber = (value, fallback = 0) => {
        const number = Number.parseFloat(value);
        return Number.isFinite(number) ? number : fallback;
    };

    const formatUtilityText = (value) => {
        const acronyms = new Map([
            ["ai", "AI"],
            ["api", "API"],
            ["aqi", "AQI"],
            ["crm", "CRM"],
            ["css", "CSS"],
            ["csv", "CSV"],
            ["diy", "DIY"],
            ["erp", "ERP"],
            ["faq", "FAQ"],
            ["hepa", "HEPA"],
            ["html", "HTML"],
            ["hvac", "HVAC"],
            ["json", "JSON"],
            ["kpi", "KPI"],
            ["pdf", "PDF"],
            ["saas", "SaaS"],
            ["seo", "SEO"],
            ["shopify", "Shopify"],
            ["sku", "SKU"],
            ["sop", "SOP"],
            ["sops", "SOPs"],
            ["sso", "SSO"],
            ["url", "URL"],
            ["zapier", "Zapier"]
        ]);
        return (value || "")
            .replace(/\b([a-z][a-z0-9]{1,5})\b/gi, (match) => acronyms.get(match.toLowerCase()) || match)
            .replace(/\s+/g, " ")
            .trim();
    };

    const createToolField = (input) => {
        const label = document.createElement("label");
        label.className = input.type === "checkbox"
            ? "utility-tool__field utility-tool__field--checkbox"
            : "utility-tool__field";
        const text = document.createElement("span");
        text.className = "utility-tool__field-label";
        text.textContent = formatUtilityText(input.label || input.key);

        let control;
        if (input.type === "select") {
            control = document.createElement("select");
            (input.options || []).forEach((option) => {
                const choice = document.createElement("option");
                choice.value = option.value || option.label || "";
                choice.textContent = option.label || option.value || "";
                if (option.result) {
                    choice.dataset.result = option.result;
                }
                if (option.weight !== undefined) {
                    choice.dataset.weight = option.weight;
                }
                control.appendChild(choice);
            });
        } else if (input.type === "checkbox") {
            control = document.createElement("input");
            control.type = "checkbox";
        } else {
            control = document.createElement("input");
            control.type = "number";
            if (input.default !== undefined) control.value = input.default;
            if (input.min !== undefined) control.min = input.min;
            if (input.max !== undefined) control.max = input.max;
            if (input.step !== undefined) control.step = input.step;
        }

        control.name = input.key;
        control.dataset.toolInput = input.key;
        if (input.type === "checkbox") {
            label.append(control, text);
        } else {
            label.append(text, control);
        }

        if (input.unit) {
            const unit = document.createElement("small");
            unit.textContent = formatUtilityText(input.unit);
            label.appendChild(unit);
        }
        return label;
    };

    const getToolValues = (form) => {
        const values = {};
        form.querySelectorAll("[data-tool-input]").forEach((control) => {
            values[control.name] = control.type === "checkbox"
                ? control.checked
                : control.value;
        });
        return values;
    };

    const findToolResult = (spec, key) =>
        (spec.results || []).find((result) => result.key === key) || null;

    const calculateUtilityResult = (spec, form) => {
        const values = getToolValues(form);
        if (spec.kind === "picker") {
            const votes = {};
            form.querySelectorAll("select[data-tool-input]").forEach((select) => {
                const selected = select.selectedOptions[0];
                const result = selected?.dataset.result;
                if (result) {
                    const weight = Math.max(1, toNumber(selected.dataset.weight, 1));
                    votes[result] = (votes[result] || 0) + weight;
                }
            });
            const winner = Object.entries(votes).sort((left, right) => right[1] - left[1])[0]?.[0] || "balanced";
            const result = findToolResult(spec, winner);
            return result
                ? { title: result.title, body: result.body }
                : { title: "Balanced fit", body: "Use the guide below to compare your constraints before deciding." };
        }

        if (spec.kind === "checklist") {
            const inputs = spec.inputs || [];
            const checked = inputs.filter((input) => values[input.key] === true).length;
            const percent = inputs.length ? Math.round((checked / inputs.length) * 100) : 0;
            const key = percent >= 80 ? "high" : percent >= 50 ? "medium" : "low";
            const result = findToolResult(spec, key);
            return {
                title: `${percent}% complete - ${formatUtilityText(result?.title || "Readiness check")}`,
                body: result?.body || "Use the guide below to close the remaining gaps."
            };
        }

        if (spec.formula === "room_area") {
            const width = toNumber(values.width, 0);
            const length = toNumber(values.length, 0);
            const ceiling = toNumber(values.ceiling, 8);
            const area = Math.max(0, width * length);
            const adjustedArea = Math.round(area * Math.max(0.75, ceiling / 8));
            const band = adjustedArea < 150 ? "small-space" : adjustedArea < 350 ? "standard-room" : "large-space";
            return {
                title: `${adjustedArea.toLocaleString()} sq ft adjusted coverage`,
                body: `Treat this as a ${band} starting point, then check real layout, airflow, obstacles, and manufacturer coverage claims before choosing.`
            };
        }

        if (spec.formula === "cost_range") {
            const materials = toNumber(values.quantity, 0) * toNumber(values.unit_cost, 0);
            const labor = toNumber(values.labor_hours, 0) * toNumber(values.hourly_rate, 0);
            const subtotal = materials + labor;
            const total = subtotal * (1 + toNumber(values.contingency, 0) / 100);
            return {
                title: `$${Math.round(total).toLocaleString()} planning estimate`,
                body: "Use this as a planning range, not a quote. Local labor, bundles, permit needs, and return policies can move the real number."
            };
        }

        if (spec.formula === "weighted_total") {
            const subtotal = toNumber(values.quantity, 0) * toNumber(values.unit_value, 0);
            const total = subtotal * (1 + toNumber(values.buffer, 0) / 100);
            return {
                title: Math.round(total).toLocaleString(),
                body: spec.results?.[0]?.body || spec.dek || "Use the result with the article-specific thresholds above."
            };
        }

        return {
            title: "Tool configuration error",
            body: "This tool has an unsupported calculation formula."
        };
    };

    const renderUtilityTools = () => {
        document.querySelectorAll("[data-tool-root]").forEach((root) => {
            if (root.dataset.rendered === "true") {
                return;
            }

            const spec = readUtilitySpec(root);
            if (spec?.error) {
                root.innerHTML = `<p class="utility-tool__error">This interactive tool is misconfigured (${spec.error}).</p>`;
                root.dataset.rendered = "true";
                return;
            }

            const form = document.createElement("form");
            form.className = spec.kind === "checklist"
                ? "utility-tool__form utility-tool__form--checklist"
                : "utility-tool__form";
            form.dataset.toolKind = spec.kind || "";
            (spec.inputs || []).forEach((input) => form.appendChild(createToolField(input)));

            const output = document.createElement("output");
            output.className = "utility-tool__result";
            output.setAttribute("aria-live", "polite");
            const title = document.createElement("strong");
            const body = document.createElement("span");
            output.append(title, body);
            const button = document.createElement("button");
            button.className = "utility-tool__action";
            button.type = "submit";
            button.textContent = spec.kind === "calculator" ? "Calculate result" : "Update result";

            const update = () => {
                const result = calculateUtilityResult(spec, form);
                title.textContent = formatUtilityText(result.title);
                body.textContent = result.body;
            };

            root.closest(".utility-tool")?.querySelector("#utility-tool-title")?.childNodes.forEach((node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    node.textContent = formatUtilityText(node.textContent);
                }
            });

            form.addEventListener("input", update);
            form.addEventListener("change", update);
            form.addEventListener("submit", (event) => {
                event.preventDefault();
                update();
            });
            form.appendChild(button);
            root.append(form, output);
            root.dataset.rendered = "true";
            update();
        });
    };
    const normalizeTableLabel = (value) => (value || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    const fitTableLabels = new Set([
        "best for",
        "good fit",
        "ideal for",
        "works best for",
        "not for",
        "skip it if",
        "not ideal for",
        "avoid if",
        "watch out if"
    ]);

    const convertThinFitTables = (articleBody) => {
        articleBody.querySelectorAll("table").forEach((table) => {
            const rows = Array.from(table.rows);
            if (rows.length < 2) {
                return;
            }

            const headerCells = Array.from(rows[0].cells);
            const dataRows = rows.slice(1).filter((row) => Array.from(row.cells).some((cell) => cell.textContent.trim()));
            if (headerCells.length !== 2 || dataRows.length !== 1 || dataRows[0].cells.length !== 2) {
                return;
            }

            const labels = headerCells.map((cell) => normalizeTableLabel(cell.textContent));
            if (!labels.every((label) => fitTableLabels.has(label))) {
                return;
            }

            const snapshot = document.createElement("div");
            snapshot.className = "fit-snapshot";
            labels.forEach((label, index) => {
                const valueCell = dataRows[0].cells[index];
                if (!valueCell || !valueCell.textContent.trim()) {
                    return;
                }

                const item = document.createElement("section");
                item.className = "fit-snapshot__item";
                const title = document.createElement("h3");
                title.className = "fit-snapshot__label";
                title.textContent = headerCells[index].textContent.trim();
                const body = document.createElement("div");
                body.className = "fit-snapshot__body";
                body.innerHTML = valueCell.innerHTML;
                item.append(title, body);
                snapshot.appendChild(item);
            });

            if (!snapshot.childElementCount) {
                return;
            }

            const host = table.closest(".table-scroll") || table;
            host.parentNode.insertBefore(snapshot, host);
            host.remove();
        });
    };

    const setTableScrollSizing = (table) => {
        const columnCount = Math.max(
            0,
            ...Array.from(table.rows).map((row) => row.cells.length));

        if (columnCount > 0) {
            table.style.setProperty("--table-column-count", columnCount.toString());
        }
    };

    const wrapTablesForScroll = (articleBody) => {
        articleBody.querySelectorAll("table").forEach((table) => {
            setTableScrollSizing(table);

            if (table.closest(".table-scroll")) {
                return;
            }

            const wrapper = document.createElement("div");
            wrapper.className = "table-scroll";
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });
    };

    document.addEventListener("DOMContentLoaded", () => {
        const article = document.querySelector("article");
        const articleBody = document.querySelector(".article-body");
        if (!articleBody) {
            return;
        }

        dedupeSummaryFromBody();
        renderUtilityTools();
        removeInlineAffiliateArtifacts(articleBody);
        repairMarkdownHeadingParagraphs(articleBody);
        enhanceFaqSections(articleBody);
        enhanceWrappedFaqSections(articleBody);
        convertThinFitTables(articleBody);
        wrapTablesForScroll(articleBody);

        const products = readProducts();
        const browseProduct = readBrowseProduct();
        const singleProductArticle = article?.matches("article[data-primary-product-name][data-primary-product-url]");
        const hasReviewVerdictCard = !!article?.querySelector(".review-verdict-card");
        const comparisonArticle = article?.dataset.contentType === "comparison";
        const roundupArticle = !comparisonArticle && (article?.dataset.contentType === "best_of" || products.length > 2);
        const multiProductArticle = products.length > 1;
        const browseGuideArticle = !!browseProduct && !singleProductArticle && !multiProductArticle;
        const commercialGuideArticle = !browseGuideArticle && isCommercialGuideArticle(article);

        if (singleProductArticle) {
            linkLeadMentions(article, articleBody);
            linkFirstMentionsPerSection(article, articleBody);
            if (!hasReviewVerdictCard) {
                placeContextualCtas(articleBody);
            }
        } else if (roundupArticle) {
            enhanceRoundupHero(article, products);
            removeLegacyRoundupBlocks(articleBody);
            linkProductMentions(articleBody, products);
        } else if (comparisonArticle) {
            removeLegacyRoundupBlocks(articleBody);
            linkProductMentions(articleBody, products);
        } else if (multiProductArticle) {
            removeLegacyRoundupBlocks(articleBody);
            linkProductMentions(articleBody, products);
        } else if (browseGuideArticle) {
            placeBrowseHeroCta(article, browseProduct);
            placeBrowseClosingCta(articleBody, browseProduct);
        } else if (commercialGuideArticle) {
            ensureGuideShopperNextStep(articleBody);
        }

        if (singleProductArticle) {
            ensureProductHeroCta(article, products);
            ensureProductMidCta(articleBody, products);
        } else if (comparisonArticle) {
            ensureProductHeroCta(article, products);
        }

        if (products.length > 1) {
            enhanceComparisonTable(articleBody, products);
        }

        articleBody.querySelectorAll("h2").forEach((heading) => {
            const text = normalize(heading.textContent);
            if (closingCalloutHeadings.has(text)) {
                enhanceBottomLine(heading);
            }
        });

        if (singleProductArticle && !hasReviewVerdictCard) {
            placeVerdictCta(articleBody);
        }

        if (singleProductArticle) {
            ensureProductClosingCta(articleBody, products, products[0].name);
        } else if (comparisonArticle) {
            ensureProductClosingCta(articleBody, products.slice(0, 2), "Compare both options");
        } else if (roundupArticle) {
            ensureProductClosingCta(articleBody, products.slice(0, 1), `Best overall: ${products[0].name}`);
        }
    });
})();