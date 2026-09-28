# Battle audio mix

An original synthesized 20-second / 8-bar score replaces the previous sparse tones: low brass harmonics, a minor-key pulse and marching percussion. A mono 22.05 kHz buffer (1.76 MB decoded) is generated once after the Play gesture and loops in Web Audio. No external audio downloads or per-frame synthesis. Existing mute/pause controls include the music; match-end fades it out, restart reuses the existing source.

Weapon gain: rifles .11 -> .20, heavy weapons .25 -> .46, vehicle destruction .45 -> .65, before existing distance attenuation. Rain gain: .075 -> .022 (71% lower). Music gain ducks from .23 to .14 for active fire. A master compressor controls coincident peaks; existing 14 combat-voice limit remains.

Validation: TypeScript/Vite build; finite score samples, duration, peak and RMS checks. These are technical checks, not a listening test or physical-device audio validation.
