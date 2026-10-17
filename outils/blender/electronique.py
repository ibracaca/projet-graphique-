# Pièces 06 à 09 : PCB, GPU GB202, GDDR7, connecteur 16 broches.
# Références : vga_body-3.png (PCB nu), photos de démontage. Aucun marquage lisible :
# la sérigraphie est faite de cadres et de repères abstraits, sans texte.
# Les positions qui servent aux effets du site (pistes lumineuses entre les colonnes
# de selfs, modules mémoire, die) sont gardées telles quelles.
import math
import random

import bpy
import numpy as np
from mathutils import Matrix

from commun import (DIM, ajouter_lignes, aretes_vives, biseauter, boite, booleen, cercle, cylindre,
                    fusionner, lignes, lisser, materiau, prisme, souder, tour, transformer, vide)

Z = DIM['Z']
PCB = DIM['PCB']
GPU = DIM['GPU']
MEM = DIM['MODULES_MEMOIRE']
ZA, ZV = Z['pcbArriere'], Z['pcbAvant']  # faces arrière et avant du PCB
D = PCB['doigts']

# Étendue de la texture du PCB (mm) : tout le contour, doigts compris.
TX0, TX1 = PCB['xMin'], PCB['xMax']
TY0, TY1 = D['yMin'], PCB['yMax']
PX_MM = 9.5

# Colonnes de selfs (centre x) : les pistes lumineuses passent entre les deux
# colonnes de chaque paire (x = -145 et x = -9, src/scene/courant.js).
COLONNES = (-150, -140, -14, -4)
PETITS_ETAGES = ((16, -40), (26, -40), (16, -28), (26, -28), (36, -34))
TROUS = ((-165, 55), (-165, -52), (35, 55), (35, -52), (-100, -28), (-40, -28), (-100, 32), (-40, 32))


def contour_pcb():
    return [(PCB['xMin'], PCB['yMin']), (D['xMin'] - 4, PCB['yMin']), (D['xMin'], D['yMin']), (D['xMin'] + 11.4, D['yMin']),
            (D['xMin'] + 11.4, D['yMin'] + 8), (D['xMin'] + 13.3, D['yMin'] + 8), (D['xMin'] + 13.3, D['yMin']),
            (D['xMax'], D['yMin']), (D['xMax'] + 4, PCB['yMin']), (PCB['xMax'], PCB['yMin']), (PCB['xMax'], PCB['yMax'] - 6),
            (PCB['xMax'] - 6, PCB['yMax']), (PCB['xMin'], PCB['yMax'])]


# ---------------------------------------------------------------------------
# Texture du PCB : pistes de cuivre en léger relief sous le vernis, vias,
# sérigraphie abstraite. Générée ici (graine fixe : le résultat est reproductible).
class Toile:
    def __init__(self):
        self.w = int((TX1 - TX0) * PX_MM)
        self.h = int((TY1 - TY0) * PX_MM)
        self.relief = np.zeros((self.h, self.w), np.float32)
        self.serigraphie = np.zeros((self.h, self.w), np.float32)

    def px(self, x, y):
        return (x - TX0) * PX_MM, (y - TY0) * PX_MM

    def segment(self, couche, a, b, largeur):
        (ax, ay), (bx, by) = self.px(*a), self.px(*b)
        r = largeur * PX_MM / 2
        x0, x1 = int(max(0, min(ax, bx) - r - 2)), int(min(self.w, max(ax, bx) + r + 3))
        y0, y1 = int(max(0, min(ay, by) - r - 2)), int(min(self.h, max(ay, by) + r + 3))
        if x0 >= x1 or y0 >= y1:
            return
        ys, xs = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        dx, dy = bx - ax, by - ay
        l2 = dx * dx + dy * dy or 1e-6
        t = np.clip(((xs - ax) * dx + (ys - ay) * dy) / l2, 0, 1)
        d = np.hypot(xs - (ax + t * dx), ys - (ay + t * dy))
        v = np.clip(r + 0.5 - d, 0, 1)
        couche[y0:y1, x0:x1] = np.maximum(couche[y0:y1, x0:x1], v)

    def disque(self, couche, c, rayon, valeur=1.0):
        cx, cy = self.px(*c)
        r = rayon * PX_MM
        x0, x1 = int(max(0, cx - r - 2)), int(min(self.w, cx + r + 3))
        y0, y1 = int(max(0, cy - r - 2)), int(min(self.h, cy + r + 3))
        if x0 >= x1 or y0 >= y1:
            return
        ys, xs = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        v = np.clip(r + 0.5 - np.hypot(xs - cx, ys - cy), 0, 1) * valeur
        couche[y0:y1, x0:x1] = np.maximum(couche[y0:y1, x0:x1], v)

    def cadre(self, x0, x1, y0, y1, largeur=0.13):
        for a, b in (((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))):
            self.segment(self.serigraphie, a, b, largeur)


def pistes_et_serigraphie():
    rnd = random.Random(5090)
    t = Toile()
    # Faisceaux de pistes : départs au hasard, routage à 0 et 45 degrés.
    for _ in range(170):
        x, y = rnd.uniform(TX0 + 4, TX1 - 4), rnd.uniform(-58, 60)
        n = rnd.choice((3, 4, 6, 8, 10))
        ecart = rnd.choice((0.55, 0.7, 0.9))
        larg = rnd.choice((0.22, 0.28, 0.35))
        dirs = [(1, 0), (0, 1), (-1, 0), (0, -1), (0.7071, 0.7071), (-0.7071, 0.7071), (0.7071, -0.7071), (-0.7071, -0.7071)]
        d = rnd.choice(dirs[:4])
        for _seg in range(rnd.randint(2, 5)):
            longueur = rnd.uniform(6, 28)
            nx, ny = -d[1], d[0]
            for k in range(n):
                o = (k - (n - 1) / 2) * ecart
                a = (x + nx * o, y + ny * o)
                b = (a[0] + d[0] * longueur, a[1] + d[1] * longueur)
                t.segment(t.relief, a, b, larg)
            x, y = x + d[0] * longueur, y + d[1] * longueur
            i = dirs.index(d) if d in dirs else 0
            d = dirs[(i + rnd.choice((4, 4, 1, 3))) % 8] if rnd.random() < 0.7 else rnd.choice(dirs[:4])
            if not (TX0 + 3 < x < TX1 - 3 and -58 < y < 60):
                break
    # Plans de masse (larges zones de cuivre, relief doux) et vias.
    for _ in range(14):
        cx, cy = rnd.uniform(TX0 + 10, TX1 - 10), rnd.uniform(-50, 50)
        w, h = rnd.uniform(8, 26), rnd.uniform(6, 20)
        for k in range(int(h / 0.9)):
            yy = cy - h / 2 + k * 0.9
            t.segment(t.relief, (cx - w / 2, yy), (cx + w / 2, yy), 1.0)
    for _ in range(900):
        c = (rnd.uniform(TX0 + 2, TX1 - 2), rnd.uniform(-58, 60))
        t.disque(t.relief, c, 0.32, 1.0)
    # Sérigraphie : cadres des composants, repères de coin, points (aucun texte).
    for x in COLONNES:
        t.cadre(x - 4.8, x + 4.8, -45, 47)
    for x, y in PETITS_ETAGES:
        t.cadre(x - 4.7, x + 4.7, y - 4.7, y + 4.7)
    for x, y, w, h in MEM:
        t.cadre(x - w / 2 - 0.8, x + w / 2 + 0.8, y - h / 2 - 0.8, y + h / 2 + 0.8)
        t.disque(t.serigraphie, (x - w / 2 - 1.6, y + h / 2 + 1.2), 0.35)
    sx, sy = GPU['substrat']
    t.cadre(GPU['x'] - sx / 2 - 1.5, GPU['x'] + sx / 2 + 1.5, GPU['y'] - sy / 2 - 1.5, GPU['y'] + sy / 2 + 1.5, 0.25)
    for x, y in TROUS:
        t.disque(t.serigraphie, (x, y), 3.3)
    for _ in range(60):
        x, y = rnd.uniform(TX0 + 5, TX1 - 5), rnd.uniform(-55, 55)
        t.segment(t.serigraphie, (x, y), (x + 2.2, y), 0.16)
        t.segment(t.serigraphie, (x, y), (x, y + 2.2), 0.16)
    return t


def flou(a, n=2):
    for _ in range(n):
        a = (a + np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1)) / 5
    return a


def image(nom, rgb, couleur=True):
    h, w = rgb.shape[:2]
    im = bpy.data.images.new(nom, w, h, alpha=False, float_buffer=False)
    # l'espace de couleur d'abord : le changer après coup régénère une image vide
    im.colorspace_settings.name = 'sRGB' if couleur else 'Non-Color'
    rgba = np.concatenate([rgb, np.ones((h, w, 1), np.float32)], axis=2)
    im.pixels.foreach_set(rgba.astype(np.float32).ravel())
    im.update()
    # enregistrée en PNG puis embarquée : sans cela l'export repart d'une image vide
    im.filepath_raw = str(__import__('pathlib').Path(bpy.app.tempdir) / f'{nom}.png')
    im.file_format = 'PNG'
    im.save()
    im.pack()
    return im


def materiau_pcb():
    """Vernis épargne noir : couleur, rugosité et normales tirées de la toile."""
    t = pistes_et_serigraphie()
    relief = flou(t.relief, 1)
    seri = np.clip(t.serigraphie, 0, 1)
    # couleur (sRGB) : vernis presque noir, cuivre à peine plus clair dessous, sérigraphie blanc cassé
    base = np.array([0.03, 0.034, 0.036], np.float32)
    cuivre = np.array([0.055, 0.06, 0.058], np.float32)
    blanc = np.array([0.6, 0.61, 0.59], np.float32)
    c = base[None, None, :] * (1 - relief[..., None]) + cuivre[None, None, :] * relief[..., None]
    c = c * (1 - seri[..., None]) + blanc[None, None, :] * seri[..., None]
    # rugosité dans le vert (convention glTF : occlusion R, rugosité G, métal B)
    rug = 0.62 - 0.2 * relief + 0.2 * seri
    orm = np.stack([np.ones_like(rug), rug, np.zeros_like(rug)], axis=2)
    # normales depuis le relief
    hauteur = flou(relief * 0.9 + seri * 0.25, 2)
    gx = (np.roll(hauteur, -1, 1) - np.roll(hauteur, 1, 1)) * 0.5
    gy = (np.roll(hauteur, -1, 0) - np.roll(hauteur, 1, 0)) * 0.5
    k = 1.6
    n = np.stack([-gx * k, -gy * k, np.ones_like(gx)], axis=2)
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    nrm = n * 0.5 + 0.5

    m = materiau('pcb', (0.01, 0.01, 0.01), 0.6, 0.0)
    nt = m.node_tree
    p = nt.nodes.get('Principled BSDF')
    tc = nt.nodes.new('ShaderNodeTexImage')
    tc.image = image('pcb_couleur', c)
    nt.links.new(tc.outputs['Color'], p.inputs['Base Color'])
    tr = nt.nodes.new('ShaderNodeTexImage')
    tr.image = image('pcb_orm', orm.astype(np.float32), couleur=False)
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(tr.outputs['Color'], sep.inputs['Color'])
    nt.links.new(sep.outputs['Green'], p.inputs['Roughness'])
    tn = nt.nodes.new('ShaderNodeTexImage')
    tn.image = image('pcb_normales', nrm.astype(np.float32), couleur=False)
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
    return m


def uv_pcb(o):
    me = o.data
    if not me.uv_layers:
        me.uv_layers.new(name='UVMap')
    uv = me.uv_layers.active.data
    for b in me.loops:
        p = me.vertices[b.vertex_index].co
        uv[b.index].uv = ((p.x - TX0) / (TX1 - TX0), (p.y - TY0) / (TY1 - TY0))


# ---------------------------------------------------------------------------
def instances(nom, modele, positions, parent):
    """Objet modèle + liste de positions [x, y, z, ...] (dessiné en une fois sur le site)."""
    modele.name = modele.data.name = nom
    modele['instances3'] = [round(v, 3) for p in positions for v in p]
    modele.parent = parent
    return modele


def pcb():
    racine = vide('pcb')
    m_pcb = materiau_pcb()
    m_or = materiau('or', (0.9, 0.7, 0.35), 0.35, 1.0)
    m_self = materiau('self', (0.05, 0.05, 0.055), 0.55, 0.3)
    m_comp = materiau('composant', (0.02, 0.02, 0.02), 0.6, 0.1)
    m_cms = materiau('cms', (0.4, 0.33, 0.25), 0.5, 0.0)
    m_cond = materiau('condensateur', (0.5, 0.5, 0.52), 0.35, 1.0)

    carte = prisme('pcb_plaque', contour_pcb(), ZA, ZV, m_pcb)
    trous = [cylindre(f'trou_{i}', x, y, 1.6, ZA - 1, ZV + 1, 32) for i, (x, y) in enumerate(TROUS)]
    booleen(carte, trous)
    fil_s, fil_a = aretes_vives([carte], 30)
    biseauter(carte, 0.15, 1, 40)
    uv_pcb(carte)
    lisser(carte, 35)
    carte.name = carte.data.name = 'pcb_plaque'
    carte.parent = racine

    # Anneaux dorés des trous de fixation, des deux côtés.
    anneaux = []
    for i, (x, y) in enumerate(TROUS):
        for z0, z1 in ((ZV + 0.01, ZV + 0.06), (ZA - 0.06, ZA - 0.01)):
            a = tour(f'anneau_{i}', [(1.6, z0), (3.1, z0), (3.1, z1), (1.6, z1)], 32, m_or, angle=40)
            transformer(a, Matrix.Translation((x, y, 0)))
            anneaux.append(a)
    # Doigts PCIe : contacts dorés des deux côtés, en une seule géométrie répétée.
    contact = boite('contact', -0.35, 0.35, D['yMin'] + 0.7, D['yMin'] + 7.7, 0, 0.05, m_or)
    pos = []
    x = D['xMin'] + 0.8
    while x < D['xMax'] - 0.5:
        if not (D['xMin'] + 11 < x < D['xMin'] + 13.8):
            pos += [(x, 0, ZV), (x, 0, ZA - 0.05)]
        x += 1.0
    instances('pcb_contacts', contact, pos, racine)
    dores = fusionner(anneaux, 'pcb_dorures')
    dores.parent = racine

    # Étages d'alimentation : selfs à dessus arrondi, en colonnes, MOSFET à côté.
    selfs, mosfets = [], []
    for x in COLONNES:
        y = -44
        while y + 7.4 <= 46.5:
            s = boite('self', x - 3.9, x + 3.9, y, y + 7.4, ZV, ZV + 6.2, m_self)
            selfs.append(s)
            y += 8.2
    for x, y in PETITS_ETAGES:
        selfs.append(boite('self', x - 4, x + 4, y - 4, y + 4, ZV, ZV + 6, m_self))
    for x_m in (-158, 3):  # côté extérieur de chaque paire de colonnes
        y = -43
        while y < 44:
            mosfets.append(boite('mosfet', x_m - 2.5, x_m + 2.5, y, y + 5.5, ZV, ZV + 1.0, m_comp))
            y += 8.2
    fs, fa = aretes_vives(selfs, 30)
    ajouter_lignes(fil_s, fil_a, fs, fa)
    for o in selfs:
        biseauter(o, 1.1, 3, 40)
    for o in mosfets:
        biseauter(o, 0.25, 1, 40)

    # Condensateurs polymère (cylindres à dessus argenté) en haut du PCB.
    conds = []
    for i, (x, y) in enumerate(((-120, 46), (-112, 46), (-104, 46), (-36, 46), (-28, 46), (-120, -48), (-112, -48), (-28, -48))):
        c = tour(f'cond_{i}', [(0.0, ZV), (2.5, ZV), (2.5, ZV + 4.6), (2.2, ZV + 5.0), (0.0, ZV + 5.0)], 32, m_cond, angle=40)
        souder(c)
        transformer(c, Matrix.Translation((x, y, 0)))
        conds.append(c)

    # Petits composants CMS (0402) par centaines : deux orientations, en instances.
    rnd = random.Random(202)
    cms_h, cms_v = [], []
    zones = [(-108, -32, -30, 34), (-60, -32, -30, 34), (-128, -112, -40, 40), (-28, -18, -40, 40), (6, 40, -20, 50)]
    for (x0, x1, y0, y1) in zones:
        for _ in range(110):
            x, y = rnd.uniform(x0, x1), rnd.uniform(y0, y1)
            # pas sur le GPU ni sur la mémoire
            if abs(x - GPU['x']) < 34 and abs(y - GPU['y']) < 31:
                continue
            if any(abs(x - mx) < mw / 2 + 1.2 and abs(y - my) < mh / 2 + 1.2 for mx, my, mw, mh in MEM):
                continue
            (cms_h if rnd.random() < 0.5 else cms_v).append((x, y, ZV))
    modele_h = boite('cms_h', -0.5, 0.5, -0.25, 0.25, 0, 0.45, m_cms)
    modele_v = boite('cms_v', -0.25, 0.25, -0.5, 0.5, 0, 0.45, m_cms)
    instances('pcb_cms_h', modele_h, cms_h, racine)
    instances('pcb_cms_v', modele_v, cms_v, racine)

    for nom, objs in (('pcb_selfs', selfs), ('pcb_mosfets', mosfets), ('pcb_condensateurs', conds)):
        o = fusionner(objs, nom)
        lisser(o, 35)
        o.parent = racine
    lignes('pcb__filaire', fil_s, fil_a, racine)
    return racine


def gpu():
    racine = vide('gpu')
    m_sub = materiau('substrat', (0.03, 0.06, 0.045), 0.55, 0.1)
    m_die = materiau('die', (0.18, 0.19, 0.2), 0.08, 0.7)
    m_cms = materiau('cms', (0.4, 0.33, 0.25), 0.5, 0.0)
    m_cadre = materiau('cadreGPU', (0.5, 0.5, 0.52), 0.35, 1.0)
    sx, sy = GPU['substrat']
    dx, dy = GPU['die']
    gx, gy = GPU['x'], GPU['y']
    sub = boite('substrat', gx - sx / 2, gx + sx / 2, gy - sy / 2, gy + sy / 2, ZV, Z['substrat'], m_sub)
    die = boite('die', gx - dx / 2, gx + dx / 2, gy - dy / 2, gy + dy / 2, Z['substrat'], Z['die'], m_die)
    # cadre de renfort métallique autour du die
    cadre = prisme('cadre', [(gx - 27, gy - 24), (gx + 27, gy - 24), (gx + 27, gy + 24), (gx - 27, gy + 24)], Z['substrat'], Z['substrat'] + 0.5, m_cadre)
    creux = prisme('creux', [(gx - 24.5, gy - 21.5), (gx + 24.5, gy - 21.5), (gx + 24.5, gy + 21.5), (gx - 24.5, gy + 21.5)], Z['substrat'] - 1, Z['substrat'] + 2)
    booleen(cadre, [creux])
    fil_s, fil_a = aretes_vives([sub, die, cadre], 30)
    biseauter(sub, 0.3, 2, 40)
    biseauter(die, 0.08, 1, 40)
    biseauter(cadre, 0.08, 1, 40)
    # petits condensateurs autour du die (sur le substrat, dans le cadre)
    rnd = random.Random(7)
    pos = []
    for _ in range(140):
        x, y = rnd.uniform(gx - 21, gx + 21), rnd.uniform(gy - 19, gy + 19)
        if abs(x - gx) < dx / 2 + 1.2 and abs(y - gy) < dy / 2 + 1.2:
            continue
        pos.append((x, y, Z['substrat']))
    instances('gpu_cms', boite('cms_gpu', -0.4, 0.4, -0.2, 0.2, 0, 0.4, m_cms), pos, racine)
    corps = fusionner([sub, cadre], 'gpu_substrat')
    for o in (corps, die):
        lisser(o, 35)
        o.parent = racine
    die.name = die.data.name = 'gpu_die'
    lignes('gpu__filaire', fil_s, fil_a, racine)
    return racine


def memoire():
    racine = vide('memoire')
    m = materiau('gddr', (0.02, 0.02, 0.022), 0.62, 0.0)
    modules = []
    for i, (x, y, w, h) in enumerate(MEM):
        b = boite(f'module_{i}', x - w / 2, x + w / 2, y - h / 2, y + h / 2, ZV + 0.15, ZV + 1.1, m)
        # repère de la broche 1 : petit creux rond dans un coin (aucun marquage)
        point = cylindre('repere', x - w / 2 + 1.6, y + h / 2 - 1.6, 0.45, ZV + 1.0, ZV + 2, 16)
        booleen(b, [point])
        modules.append(b)
    fil_s, fil_a = aretes_vives(modules, 30)
    for b in modules:
        biseauter(b, 0.3, 2, 40)
    corps = fusionner(modules, 'memoire_modules')
    lisser(corps, 35)
    corps.parent = racine
    lignes('memoire__filaire', fil_s, fil_a, racine)
    return racine


def connecteur():
    """Connecteur 16 broches, ouverture vers le haut (+y) : 12 alvéoles de puissance
    sur deux rangées, 4 de signal au-dessus, clip de verrouillage, broches au fond."""
    racine = vide('connecteur')
    m = materiau('connecteur', (0.02, 0.02, 0.02), 0.5, 0.0)
    m_or = materiau('or', (0.9, 0.7, 0.35), 0.35, 1.0)
    x0, x1, y0, y1 = -8, 13, 52, 61
    z0, z1 = ZV, ZV + 11
    boitier = boite('boitier', x0, x1, y0, y1, z0, z1, m)
    alveoles, broches = [], []
    for r in range(2):
        for c in range(6):
            x = x0 + 2.2 + c * 3
            z = z0 + 3.3 + r * 3.6
            alveoles.append(boite('alveole', x, x + 2.4, y0 + 2.5, y1 + 1, z - 1.3, z + 1.3))
            broches.append(boite('broche', x + 0.7, x + 1.7, y0 + 2.4, y0 + 4.5, z - 0.5, z + 0.5, m_or))
    for c in range(4):
        x = x0 + 4 + c * 4
        alveoles.append(boite('signal', x, x + 1.4, y0 + 4, y1 + 1, z1 - 1.8, z1 - 0.6))
    booleen(boitier, alveoles)
    clip = boite('clip', x0 + 6, x1 - 6, y1 - 3.5, y1 + 0.6, z1, z1 + 1.6, m)
    rampe = boite('rampe', x0 + 7, x1 - 7, y1 - 1.5, y1 + 0.6, z1 + 1.6, z1 + 2.4, m)
    fil_s, fil_a = aretes_vives([boitier, clip], 30)
    for o in (boitier, clip, rampe):
        biseauter(o, 0.25, 2, 40)
    corps = fusionner([boitier, clip, rampe], 'connecteur_boitier')
    br = fusionner(broches, 'connecteur_broches')
    for o in (corps, br):
        lisser(o, 35)
        o.parent = racine
    lignes('connecteur__filaire', fil_s, fil_a, racine)
    return racine


def construire():
    pcb()
    gpu()
    memoire()
    connecteur()
