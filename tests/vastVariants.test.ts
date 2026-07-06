// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { parseVast } from '../src/ads/VastParser'

// ─── Google IMA-style fixtures ────────────────────────────────────────────────

const GOOGLE_IMA = `
<VAST version="3.0">
  <Ad id="gam-preroll-001">
    <InLine>
      <AdSystem>GDFP</AdSystem>
      <AdTitle>Google IMA Preroll</AdTitle>
      <Description>Sample preroll ad</Description>
      <Impression id="imp1">https://googleads.g.doubleclick.net/imp?1</Impression>
      <Impression id="imp2">https://googleads.g.doubleclick.net/imp?2</Impression>
      <Creatives>
        <Creative id="cr1">
          <Linear>
            <Duration>00:00:15</Duration>
            <TrackingEvents>
              <Tracking event="start">https://pubads.g.doubleclick.net/track?start</Tracking>
              <Tracking event="firstQuartile">https://pubads.g.doubleclick.net/track?q1</Tracking>
              <Tracking event="midpoint">https://pubads.g.doubleclick.net/track?mid</Tracking>
              <Tracking event="thirdQuartile">https://pubads.g.doubleclick.net/track?q3</Tracking>
              <Tracking event="complete">https://pubads.g.doubleclick.net/track?complete</Tracking>
            </TrackingEvents>
            <VideoClicks>
              <ClickThrough id="click1"><![CDATA[https://advertiser.example.com/landing]]></ClickThrough>
              <ClickTracking id="ctrack1">https://pubads.g.doubleclick.net/click?1</ClickTracking>
            </VideoClicks>
            <MediaFiles>
              <MediaFile id="mf1" delivery="progressive" type="video/mp4" width="1280" height="720" bitrate="2000">
                <![CDATA[https://storage.googleapis.com/gvabox/media/samples/stock.mp4]]>
              </MediaFile>
              <MediaFile id="mf2" delivery="progressive" type="video/mp4" width="640" height="360" bitrate="500">
                <![CDATA[https://storage.googleapis.com/gvabox/media/samples/stock-low.mp4]]>
              </MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
      <Error>https://pubads.g.doubleclick.net/error?[ERRORCODE]</Error>
    </InLine>
  </Ad>
</VAST>`

describe('VAST parser — Google IMA format', () => {
  it('parses all fields from a Google IMA inline ad', () => {
    const [ad] = parseVast(GOOGLE_IMA)
    expect(ad).toBeDefined()
    expect(ad!.id).toBe('gam-preroll-001')
    expect(ad!.duration).toBe(15)
    expect(ad!.mediaFiles).toHaveLength(2)
    expect(ad!.mediaFiles[0]!.width).toBe(1280)
    expect(ad!.mediaFiles[0]!.bitrate).toBe(2000)
    expect(ad!.mediaFiles[1]!.bitrate).toBe(500)
  })

  it('collects multiple Impression URLs', () => {
    const [ad] = parseVast(GOOGLE_IMA)
    expect(ad!.impressionUrls).toHaveLength(2)
    expect(ad!.impressionUrls[0]).toContain('imp?1')
    expect(ad!.impressionUrls[1]).toContain('imp?2')
  })

  it('parses ClickThrough and ClickTracking from CDATA', () => {
    const [ad] = parseVast(GOOGLE_IMA)
    expect(ad!.clickThroughUrl).toBe('https://advertiser.example.com/landing')
    expect(ad!.clickTrackingUrls).toHaveLength(1)
    expect(ad!.clickTrackingUrls[0]).toContain('click?1')
  })

  it('parses all five standard tracking events', () => {
    const [ad] = parseVast(GOOGLE_IMA)
    const events = ad!.trackingEvents.map(t => t.event)
    expect(events).toContain('start')
    expect(events).toContain('firstQuartile')
    expect(events).toContain('midpoint')
    expect(events).toContain('thirdQuartile')
    expect(events).toContain('complete')
  })

  it('parses Error URL with [ERRORCODE] macro intact', () => {
    const [ad] = parseVast(GOOGLE_IMA)
    expect(ad!.errorUrls[0]).toContain('[ERRORCODE]')
  })
})

// ─── FreeWheel-style fixtures ─────────────────────────────────────────────────

const FREEWHEEL = `
<VAST version="2.0">
  <Ad id="fw-12345">
    <InLine>
      <AdSystem version="1.0">FreeWheel</AdSystem>
      <AdTitle>FreeWheel Ad</AdTitle>
      <Impression>https://5b.astatic.com/impression</Impression>
      <Creatives>
        <Creative>
          <Linear>
            <Duration>00:00:30.000</Duration>
            <AdParameters><![CDATA[{"key":"value"}]]></AdParameters>
            <TrackingEvents>
              <Tracking event="start">https://5b.astatic.com/t?e=start</Tracking>
              <Tracking event="complete">https://5b.astatic.com/t?e=complete</Tracking>
            </TrackingEvents>
            <MediaFiles>
              <MediaFile delivery="progressive" type="video/mp4" width="640" height="480">
                https://cdn.freewheel.tv/creative.mp4
              </MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
      <Extensions>
        <Extension type="FreeWheel">
          <FWFeedId>1234567</FWFeedId>
        </Extension>
      </Extensions>
    </InLine>
  </Ad>
</VAST>`

describe('VAST parser — FreeWheel format', () => {
  it('parses duration with milliseconds (HH:MM:SS.mmm)', () => {
    const [ad] = parseVast(FREEWHEEL)
    // 00:00:30.000 → toSec splits on ':' giving ["00","00","30.000"]
    // Number("30.000") = 30, so duration should be 30
    expect(ad!.duration).toBe(30)
  })

  it('ignores AdParameters and Extension blocks without error', () => {
    expect(() => parseVast(FREEWHEEL)).not.toThrow()
    const [ad] = parseVast(FREEWHEEL)
    expect(ad!.mediaFiles).toHaveLength(1)
  })

  it('handles a media URL without CDATA (plain text node)', () => {
    const [ad] = parseVast(FREEWHEEL)
    expect(ad!.mediaFiles[0]!.url).toContain('creative.mp4')
  })
})

// ─── Xandr (AppNexus)-style fixtures ─────────────────────────────────────────

const XANDR_INLINE = `
<VAST version="3.0">
  <Ad id="xandr-abc">
    <InLine>
      <AdSystem>AppNexus</AdSystem>
      <AdTitle>Xandr Linear Ad</AdTitle>
      <Impression>https://ib.adnxs.com/imp</Impression>
      <Creatives>
        <Creative>
          <Linear skipoffset="00:00:05">
            <Duration>00:00:30</Duration>
            <TrackingEvents>
              <Tracking event="skip">https://ib.adnxs.com/t?skip</Tracking>
            </TrackingEvents>
            <VideoClicks>
              <ClickThrough>https://adclick.g.doubleclick.net/pcs/click</ClickThrough>
              <ClickTracking>https://ib.adnxs.com/click</ClickTracking>
            </VideoClicks>
            <MediaFiles>
              <MediaFile type="video/mp4" width="1920" height="1080" bitrate="3000">
                https://cdn.adnxs.com/ad.mp4
              </MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>`

describe('VAST parser — Xandr/AppNexus format', () => {
  it('parses skipoffset as seconds from HH:MM:SS format', () => {
    const [ad] = parseVast(XANDR_INLINE)
    expect(ad!.skipOffset).toBe(5)
  })

  it('parses skip tracking event', () => {
    const [ad] = parseVast(XANDR_INLINE)
    const skipTrack = ad!.trackingEvents.find(t => t.event === 'skip')
    expect(skipTrack).toBeDefined()
    expect(skipTrack!.url).toContain('skip')
  })

  it('parses ClickThrough URL', () => {
    const [ad] = parseVast(XANDR_INLINE)
    expect(ad!.clickThroughUrl).toContain('doubleclick.net')
  })
})

// ─── SpotX-style fixtures ─────────────────────────────────────────────────────

const SPOTX = `
<VAST version="3.0">
  <Ad id="spotx-99">
    <InLine>
      <AdSystem>SpotX</AdSystem>
      <AdTitle>SpotX Ad</AdTitle>
      <Impression>https://search.spotxchange.com/imp</Impression>
      <Creatives>
        <Creative>
          <Linear skipoffset="15%">
            <Duration>00:01:00</Duration>
            <MediaFiles>
              <MediaFile delivery="progressive" type="video/mp4" width="1280" height="720" bitrate="1800">
                https://cdn.spotxcdn.com/video-hd.mp4
              </MediaFile>
              <MediaFile delivery="progressive" type="video/mp4" width="640" height="360" bitrate="600">
                https://cdn.spotxcdn.com/video-sd.mp4
              </MediaFile>
              <MediaFile delivery="progressive" type="video/webm" width="640" height="360" bitrate="500">
                https://cdn.spotxcdn.com/video.webm
              </MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>`

describe('VAST parser — SpotX format', () => {
  it('parses skipoffset as percentage of duration', () => {
    const [ad] = parseVast(SPOTX)
    // 15% of 60s = 9s
    expect(ad!.skipOffset).toBe(9)
    expect(ad!.duration).toBe(60)
  })

  it('parses all three MediaFile entries', () => {
    const [ad] = parseVast(SPOTX)
    expect(ad!.mediaFiles).toHaveLength(3)
  })

  it('parses webm media file mime type', () => {
    const [ad] = parseVast(SPOTX)
    const webm = ad!.mediaFiles.find(f => f.mimeType === 'video/webm')
    expect(webm).toBeDefined()
    expect(webm!.url).toContain('.webm')
  })
})

// ─── Defensive / edge cases ───────────────────────────────────────────────────

const VAST_ZERO_DURATION = `
<VAST version="3.0">
  <Ad id="zero-dur">
    <InLine>
      <AdTitle>Zero Duration</AdTitle>
      <Impression>https://tracking.example.com/imp</Impression>
      <Creatives>
        <Creative>
          <Linear>
            <Duration>00:00:00</Duration>
            <MediaFiles>
              <MediaFile type="video/mp4" width="640" height="360">
                https://cdn.example.com/ad.mp4
              </MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>`

const VAST_NO_ERROR_URL = `
<VAST version="3.0">
  <Ad id="no-error">
    <InLine>
      <AdTitle>No Error URL</AdTitle>
      <Impression>https://tracking.example.com/imp</Impression>
      <Creatives>
        <Creative>
          <Linear>
            <Duration>00:00:10</Duration>
            <MediaFiles>
              <MediaFile type="video/mp4" width="640" height="360">
                https://cdn.example.com/ad.mp4
              </MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>`

const VAST_UNKNOWN_TRACKING = `
<VAST version="3.0">
  <Ad id="unknown-events">
    <InLine>
      <Impression>https://tracking.example.com/imp</Impression>
      <Creatives>
        <Creative>
          <Linear>
            <Duration>00:00:10</Duration>
            <TrackingEvents>
              <Tracking event="start">https://tracking.example.com/start</Tracking>
              <Tracking event="creativeView">https://tracking.example.com/view</Tracking>
              <Tracking event="acceptInvitationLinear">https://tracking.example.com/accept</Tracking>
            </TrackingEvents>
            <MediaFiles>
              <MediaFile type="video/mp4" width="640" height="360">
                https://cdn.example.com/ad.mp4
              </MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>`

describe('VAST parser — defensive / edge cases', () => {
  it('parses ad with zero duration without throwing', () => {
    expect(() => parseVast(VAST_ZERO_DURATION)).not.toThrow()
    const [ad] = parseVast(VAST_ZERO_DURATION)
    expect(ad!.duration).toBe(0)
  })

  it('returns empty errorUrls array when no <Error> element present', () => {
    const [ad] = parseVast(VAST_NO_ERROR_URL)
    expect(ad!.errorUrls).toEqual([])
  })

  it('ignores unknown/non-standard tracking event names', () => {
    const [ad] = parseVast(VAST_UNKNOWN_TRACKING)
    const events = ad!.trackingEvents.map(t => t.event)
    expect(events).toContain('start')
    expect(events).not.toContain('creativeView')
    expect(events).not.toContain('acceptInvitationLinear')
  })

  it('returns empty array for VAST with no <Ad> elements', () => {
    const ads = parseVast('<VAST version="3.0"></VAST>')
    expect(ads).toEqual([])
  })

  it('handles ad with no clickthrough (no clickThroughUrl in result)', () => {
    const [ad] = parseVast(VAST_NO_ERROR_URL)
    expect(ad).not.toHaveProperty('clickThroughUrl')
  })

  it('parses ad id from attribute, falls back to generated UUID', () => {
    const [ad] = parseVast(VAST_NO_ERROR_URL)
    expect(ad!.id).toBe('no-error')
  })
})
