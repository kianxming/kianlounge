import { test, expect } from '@playwright/test';

test.describe('Wano Kairo V3 vertical slice',()=>{
  test('village life, target-first sortie and separate battle scene',async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    await page.goto('/v3.html');
    await expect(page.getByText('꽃의 도시').first()).toBeVisible();
    await expect(page.locator('.chara')).toHaveCount(8);
    await page.getByRole('button',{name:/건설/}).click();
    await expect(page.getByRole('button',{name:/음식점/})).toBeVisible();
    await page.getByRole('button',{name:'×'}).click();
    await page.getByRole('button',{name:/세계/}).click();
    await page.getByRole('button',{name:/바쿠라/}).click();
    await page.getByRole('button',{name:'공격'}).click();
    await page.getByRole('button',{name:/루피/}).click();
    await page.getByRole('button',{name:/조로/}).click();
    await page.getByRole('button',{name:'출정'}).click();
    await expect(page.getByText('군단 조우!')).toBeVisible({timeout:16000});
    await page.getByRole('button',{name:'전투 보기'}).click();
    await expect(page.getByText('⚔ 전투')).toBeVisible();
    await expect(page.locator('.fighter.ally')).toHaveCount(2);
    await expect(page.locator('.fighter.enemy').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('iphone surface stays inside viewport',async({page},testInfo)=>{
    test.skip(!testInfo.project.name.includes('iphone'));
    await page.goto('/v3.html');
    const widths=await page.evaluate(()=>({inner:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
    expect(widths.doc).toBeLessThanOrEqual(widths.inner+1);expect(widths.body).toBeLessThanOrEqual(widths.inner+1);
    await expect(page.locator('.bottom-nav')).toBeVisible();
  });
});
