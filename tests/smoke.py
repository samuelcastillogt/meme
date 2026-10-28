from pathlib import Path

from playwright.sync_api import sync_playwright


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    page.set_default_timeout(90_000)
    page.set_default_navigation_timeout(90_000)
    errors = []
    page.on(
        "console",
        lambda message: errors.append(message.text)
        if message.type == "error" and "/_next/hmr" not in message.text
        else None,
    )

    page.goto("http://127.0.0.1:3000", wait_until="domcontentloaded")
    page.locator(".meme-grid").wait_for()
    assert page.locator("h1").get_by_text("Las historias detrás").is_visible()
    first_story = page.locator(".meme-card h3 a").first
    story_path = first_story.get_attribute("href")
    assert story_path

    page.goto(f"http://127.0.0.1:3000{story_path}", wait_until="domcontentloaded")
    page.locator(".article-layout").wait_for()
    assert "content_md" in page.locator(".column-label").inner_text()

    page.goto("http://127.0.0.1:3000/admin", wait_until="domcontentloaded")
    assert "/admin/login" in page.url
    page.get_by_label("Contraseña").fill("admin")
    page.get_by_role("button", name="Ingresar").click(no_wait_after=True)
    page.wait_for_function("location.pathname === '/admin'")
    assert page.get_by_role("heading", name="Panel editorial").is_visible()
    assert page.get_by_role("heading", name="Ejecutar scraper").is_visible()
    page.get_by_label("Proceso").select_option("scrape")
    page.get_by_label("Límite").fill("1")
    page.get_by_role("button", name="Iniciar proceso").click(no_wait_after=True)
    page.wait_for_function("location.search.includes('scraper=started')")
    page.locator(".job-status.completed").first.wait_for(timeout=120_000)

    Path("C:/Users/jcastillo/AppData/Local/Temp/opencode").mkdir(parents=True, exist_ok=True)
    page.screenshot(path="C:/Users/jcastillo/AppData/Local/Temp/opencode/meme-atlas.png", full_page=True)
    assert not errors, errors
    browser.close()
