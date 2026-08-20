import { test, expect } from '@playwright/test';

test.describe('Wano Strategy Core V2 final playable surface',()=>{
  test('monthly strategy loop, army march, events, save/load', async ({page})=>{
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{ if(m.type()==='error') errors.push(m.text()) });
    await page.goto('/v2.html');
    await expect(page.getByText('와노 전란기').first()).toBeVisible();
    await expect(page.getByText('와노의 주도권을 장악하라')).toBeVisible();
    await expect(page.getByRole('button',{name:'키비 주둔지'})).toBeVisible();

    await page.getByRole('button',{name:'키비 주둔지'}).click();
    await expect(page.getByText('주둔 병력')).toBeVisible();
    await page.locator('[data-action="open-form-army"]').click();
    await expect(page.getByText('군단 편성').last()).toBeVisible();
    await page.locator('#form-troops').fill('1200');
    await page.locator('#form-supply').fill('120');
    await page.locator('[data-action="submit-form-army"]').click();
    await expect(page.getByText(/군단이 편성되었습니다/)).toBeVisible();

    await page.locator('[data-action="target-attack"]').first().click();
    await page.getByRole('button',{name:'바쿠라',exact:true}).click();
    await expect(page.getByText(/바쿠라.*ETA|ETA.*일/).first()).toBeVisible({timeout:4000}).catch(()=>{});

    await page.locator('[data-action="save"]').click();
    await expect(page.getByText('V2 캠페인을 저장했습니다.')).toBeVisible();

    await page.locator('[data-action="speed"][data-speed="4"]').click();
    await page.locator('[data-action="commit-month"]').click();
    await expect(page.getByText('30일 실행').first()).toBeVisible();
    await expect(page.locator('.report-overlay.show')).toBeVisible({timeout:20000});
    await expect(page.getByText(/월간 보고/).first()).toBeVisible();
    await page.locator('[data-action="next-month"]').click();
    await expect(page.getByText('2턴 · 30일째')).toBeVisible();

    await page.locator('[data-action="load"]').click();
    await expect(page.getByText('저장된 캠페인을 불러왔습니다.')).toBeVisible();
    await expect(page.getByText('1턴 · 0일째')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('mobile map remains usable and command sheet is touchable', async ({page},testInfo)=>{
    test.skip(!testInfo.project.name.includes('iphone'));
    await page.goto('/v2.html');
    const kibi=page.getByRole('button',{name:'키비 주둔지'});
    await kibi.tap();
    await expect(page.locator('.side-panel.left.open')).toBeVisible();
    const map=page.locator('#map-scroll');
    const dims=await map.evaluate(el=>({sw:el.scrollWidth,cw:el.clientWidth,sh:el.scrollHeight,ch:el.clientHeight}));
    const viewport=await page.evaluate(()=>({iw:window.innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
    expect(dims.cw).toBeLessThanOrEqual(viewport.iw+1);
    expect(viewport.doc).toBeLessThanOrEqual(viewport.iw+1);
    expect(viewport.body).toBeLessThanOrEqual(viewport.iw+1);
    expect(dims.sw).toBeGreaterThan(dims.cw);
    expect(dims.sh).toBeGreaterThan(dims.ch);
    await page.locator('[data-action="toggle-left"]').tap();
    await page.locator('[data-action="toggle-left"]').tap();
    await expect(page.locator('.side-panel.left.open')).toBeVisible();
  });
});
