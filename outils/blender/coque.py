# Pièce 01 : la coque (carénage), ses verres fumés, ses barres lumineuses, l'écusson.
# Références : vga_body-1.png (coque seule), card-f-1.png, produit-2.webp (face,
# contours calés au pixel, repris de src/carte/coque.js), produit-5.webp (flanc).
# Aucun logo : les verres restent lisses, l'écusson garde une plaque nue.
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

from commun import (DIM, appliquer, arc_points, biseauter, booleen, cylindre, decouper, fusionner,
                    lier, lignes, lisser, materiau, pivoter_autour, prisme, aretes_vives, tour,
                    transformer, vide)

C = DIM['COQUE']
X_MIN, Y_MIN, Y_MAX = C['xMin'], C['yMin'], C['yMax']
XE = DIM['X_EMBOUT']
V = DIM['VENTILATEURS']
F = DIM['FACADE']
B = DIM['BARRES']
R_OUV = V['rayonAnneau']  # ouverture des ventilateurs : 56,5
R_LUNETTE = 59.8  # bord extérieur de la lunette en relief autour de chaque ouverture
R_COUPE = 59.6  # les pièces de façade s'arrêtent sur la lunette

# Les verres fumés ne sont pas posés à plat : ils pivotent autour de leur bord
# collé à la coque et avancent vers le bas (vga_body-1, card-f-1).
# (axe de pivot à y fixe, angle en degrés autour de X)
INCLINAISON_VERRE = {'coinHaut': (Y_MAX, -4.0), 'coinBas': (-23.0, -7.5)}


def incliner_verre(o, nom):
    y, angle = INCLINAISON_VERRE[nom]
    pivoter_autour(o, 'X', angle, (0, y, 34.0))


def permuter(o, m):
    """Change les axes d'un objet construit à plat (profil dessiné dans un autre plan)."""
    transformer(o, Matrix(m).to_4x4())
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()


def coupes_ventilateurs(z0=20, z1=45, r=R_COUPE):
    return [cylindre(f'coupe_{i}', x, y, r, z0, z1) for i, (x, y) in enumerate(V['centres'])]


def copie_filaire(o):
    """Double d'un objet, gardé sans biseau pour en tirer le filaire."""
    c = o.copy()
    c.data = o.data.copy()
    bpy.context.scene.collection.objects.link(c)
    return c


# ---------------------------------------------------------------------------
def plaque(mat):
    contour = [(X_MIN + 2, Y_MIN), (XE, Y_MIN), (XE, Y_MAX), (X_MIN + 2, Y_MAX), (X_MIN, Y_MAX - 2), (X_MIN, Y_MIN + 2)]
    o = prisme('plaque', contour, 31, 34, mat)
    booleen(o, coupes_ventilateurs(20, 45, R_OUV))
    return o


def lunettes(mat):
    """Lunette moulée en relief autour de chaque ouverture (vga_body-1)."""
    profil = [(R_OUV, 31.0), (R_OUV, 34.9)] + arc_points(57.9, 34.9, 1.4, 180, 75, 8) + [(59.3, 34.4), (R_LUNETTE, 33.7), (R_LUNETTE, 31.0)]
    obj = []
    for i, (x, y) in enumerate(V['centres']):
        o = tour(f'lunette_{i}', profil, 160, mat, angle=40)
        transformer(o, Matrix.Translation((x, y, 0)))
        obj.append(o)
    return obj


def facettes(mat):
    obj = []
    for i, (contour, inclinaison) in enumerate(F['facettes']):
        cx = sum(p[0] for p in contour) / len(contour)
        cy = sum(p[1] for p in contour) / len(contour)
        o = prisme(f'facette_{i}', contour, 32.6, 34.8, mat)
        pivoter_autour(o, 'X', inclinaison, (cx, cy, 34.2))
        booleen(o, coupes_ventilateurs())
        obj.append(o)
    return obj


def inserts(mat):
    obj = []
    for i, contour in enumerate(F['entreVentilateurs']):
        o = prisme(f'insert_{i}', contour, 33.2, 34.4, mat)
        booleen(o, coupes_ventilateurs())
        obj.append(o)
    return obj


def verres(mat, fentes):
    """Verres fumés : plaques épaisses, chanfreinées, découpées par les lunettes,
    avec les fentes où s'encastrent les barres lumineuses."""
    obj = []
    for nom in ('coinHaut', 'coinBas'):
        # le dos du verre plonge dans la coque : pas de jour sous la plaque inclinée
        o = prisme(f'verre_{nom}', F[nom], 31.5, 37.0, mat)
        incliner_verre(o, nom)
        booleen(o, coupes_ventilateurs() + fentes[nom])
        obj.append(o)
    # plaque fumée de la tranche du dessus, à gauche du connecteur
    from commun import boite
    obj.append(boite('verre_dessus', -135, -35, Y_MAX - 0.5, Y_MAX + 0.8, 13, 30, mat))
    return obj


def embout(mat):
    """Embout droit : bloc à grandes facettes (pan coupé devant, chanfreins haut et bas)."""
    a = prisme('embout', [(XE, -33), (179.5, -33), (179.5, 20), (169.5, 34), (XE, 34)], Y_MIN, Y_MAX, mat)
    permuter(a, [[1, 0, 0], [0, 0, 1], [0, 1, 0]])  # profil (x, z), extrudé en y
    b = prisme('embout_yz', [(Y_MIN, -34), (Y_MAX, -34), (Y_MAX, 22), (Y_MAX - 9, 34.5), (Y_MIN + 9, 34.5), (Y_MIN, 22)], XE - 1, 181)
    permuter(b, [[0, 0, 1], [1, 0, 0], [0, 1, 0]])  # profil (y, z), extrudé en x
    booleen(a, [b], 'INTERSECT')
    return a


def jupes(mat_clair, mat_noir):
    from commun import boite
    clair = [
        boite('jupe_bas', X_MIN, XE, Y_MIN, Y_MIN + 2, 0, 31, mat_clair),
        boite('flanc_haut', X_MIN, X_MIN + 2, 38, Y_MAX, -30, 31, mat_clair),
        boite('flanc_bas', X_MIN, X_MIN + 2, Y_MIN, 38, 3, 31, mat_clair),
    ]
    noir = [
        boite('rebord_dessus', X_MIN, XE, Y_MAX - 2, Y_MAX, 12, 31, mat_noir),
        boite('plaque_dessus', 22, 158, Y_MAX - 3, Y_MAX, -10, 30, mat_noir),
    ]
    return clair, noir


def rainures(mat):
    """Nervures diagonales du flanc côté équerre (produit-5.webp), dessinées dans le
    plan (z, y) puis posées sur la face x = xMin."""
    zones = [[(-27, 39), (31, 39), (31, 72), (-27, 72)], [(5, 3), (31, 3), (31, 39), (5, 39)]]
    a = math.radians(48)
    c, s = math.cos(a), math.sin(a)
    obj = []
    for k in range(-6, 12):
        cz, cy = -10 + k * 6.5 * c, 40 + k * 6.5 * s
        bande = [(cz + u * s + v * c, cy - u * c + v * s) for u, v in ((-60, -1.1), (60, -1.1), (60, 1.1), (-60, 1.1))]
        for zone in zones:
            m = decouper(bande, zone)
            if len(m) < 3:
                continue
            o = prisme(f'rainure_{k}', m, 0, 0.8, mat)
            # (z, y, épaisseur) vers (x, y, z) : la nervure sort du flanc vers -x
            permuter(o, [[0, 0, -1], [0, 1, 0], [1, 0, 0]])
            transformer(o, Matrix.Translation((X_MIN, 0, 0)))
            obj.append(o)
    return obj


# ---------------------------------------------------------------------------
# Barres « /// » : conduits de lumière sous le verre, qui remontent en crochet
# et passent par-dessus la tranche (card-f-1.png, produit-3.webp).
Z_BARRES = (35.0, 36.7)  # sous la surface du verre (37) : encastrées


def fentes_barres(groupe, en_haut, jeu=0.35):
    """Outils de découpe des fentes : la barre et son crochet, élargis d'un jeu."""
    L, larg = B['longueur'], 4.4
    ang = math.radians(B['angle'])
    d = Vector((math.cos(ang), math.sin(ang), 0))
    from commun import boite
    outils = []
    for i, (cx, cy) in enumerate(groupe['centres']):
        f = boite(f'fente_{i}', -L / 2 - jeu, L / 2 + jeu, -larg / 2 - jeu, larg / 2 + jeu, Z_BARRES[0], 40)
        transformer(f, Matrix.Translation((cx, cy, 0)) @ Matrix.Rotation(ang, 4, 'Z'))
        bout = Vector((cx, cy, 0)) + d * (L / 2 if en_haut else -L / 2)
        y0, y1 = (bout.y - 2, Y_MAX + 3) if en_haut else (Y_MIN - 3, bout.y + 2)
        g = boite(f'fente_crochet_{i}', bout.x - larg / 2 - jeu, bout.x + larg / 2 + jeu, y0, y1, Z_BARRES[0], 40)
        for o in (f, g):
            incliner_verre(o, 'coinHaut' if en_haut else 'coinBas')
        outils += [f, g]
    return outils


def barres(groupe, en_haut):
    L, larg = B['longueur'], 4.4
    z0, z1 = Z_BARRES
    ang = math.radians(B['angle'])
    d = Vector((math.cos(ang), math.sin(ang), 0))
    morceaux = []
    from commun import boite
    for i, (cx, cy) in enumerate(groupe['centres']):
        barre = boite(f'barre_{i}', -L / 2, L / 2, -larg / 2, larg / 2, z0, z1)
        transformer(barre, Matrix.Translation((cx, cy, 0)) @ Matrix.Rotation(ang, 4, 'Z'))
        bout = Vector((cx, cy, 0)) + d * (L / 2 if en_haut else -L / 2)
        x = bout.x
        if en_haut:
            crochet = boite(f'crochet_{i}', x - larg / 2, x + larg / 2, bout.y - 2, Y_MAX + 0.9, z0, z1)
            dessus = boite(f'dessus_{i}', x - larg / 2, x + larg / 2, Y_MAX - 0.6, Y_MAX + 0.9, 22, z1)
        else:
            crochet = boite(f'crochet_{i}', x - larg / 2, x + larg / 2, Y_MIN - 0.9, bout.y + 2, z0, z1)
            dessus = boite(f'dessus_{i}', x - larg / 2, x + larg / 2, Y_MIN - 0.9, Y_MIN + 0.6, 22, z1)
        for o in (barre, crochet, dessus):
            biseauter(o, 0.45, 2, 40)
        for o in (barre, crochet):
            incliner_verre(o, 'coinHaut' if en_haut else 'coinBas')
        morceaux += [barre, crochet, dessus]
    o = fusionner(morceaux, 'barres_haut__neon' if en_haut else 'barres_bas__neon')
    # repère local : x le long des barres, pour le dégradé (bleu vers le bord de la carte)
    cx = sum(p[0] for p in groupe['centres']) / 3
    cy = sum(p[1] for p in groupe['centres']) / 3
    m = Matrix.Translation((cx, cy, 0)) @ Matrix.Rotation(ang, 4, 'Z')
    transformer(o, m.inverted())
    o.matrix_world = m
    o['neon_axe'] = 'x'
    o['neon_min'] = L / 2 if en_haut else -L / 2
    o['neon_max'] = -L / 2 if en_haut else L / 2
    return o


def contour_bouclier(k=1.0, n=48):
    """Écusson : goutte allongée, dessus arrondi, pointe adoucie (30 × 44 mm)."""
    pts = []
    for i in range(n + 1):  # dessus : demi-ellipse
        t = math.pi * i / n
        pts.append((15 * math.cos(t), 6 + 14 * math.sin(t)))
    for i in range(1, n):  # flanc gauche puis droit, en courbe de Bézier jusqu'à la pointe
        t = i / n
        if t <= 0.5:
            u = t * 2
            p0, p1, p2 = (-15, 6), (-13.5, -13), (0, -24)
        else:
            u = (t - 0.5) * 2
            p0, p1, p2 = (0, -24), (13.5, -13), (15, 6)
        x = (1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * p1[0] + u ** 2 * p2[0]
        y = (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * p1[1] + u ** 2 * p2[1]
        pts.append((x, y))
    # dédoublonne la pointe, met à l'échelle autour du centre
    propre = []
    for p in pts:
        if not propre or (abs(p[0] - propre[-1][0]) + abs(p[1] - propre[-1][1])) > 1e-6:
            propre.append((p[0] * k, p[1] * k))
    return propre


def anneau_plat(nom, ext, int_, z0, z1, mat=None):
    """Bande fermée entre deux contours de même nombre de points."""
    n = len(ext)
    s = [(x, y, z0) for x, y in ext] + [(x, y, z0) for x, y in int_] + [(x, y, z1) for x, y in ext] + [(x, y, z1) for x, y in int_]
    f = []
    for i in range(n):
        j = (i + 1) % n
        f.append((i, j, 2 * n + j, 2 * n + i))  # flanc extérieur
        f.append((n + j, n + i, 3 * n + i, 3 * n + j))  # flanc intérieur
        f.append((2 * n + i, 2 * n + j, 3 * n + j, 3 * n + i))  # dessus
        f.append((j, i, n + i, n + j))  # dessous
    me = bpy.data.meshes.new(nom)
    me.from_pydata(s, [], f)
    o = lier(bpy.data.objects.new(nom, me))
    if mat:
        me.materials.append(mat)
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    return o


def ecusson(mat_plaque):
    ext, int_ = contour_bouclier(1.0), contour_bouclier(0.86)
    bague = anneau_plat('ecusson_bague__neon', ext, int_, 0, 1.6)
    biseauter(bague, 0.3, 2, 40)
    plaque_ = prisme('ecusson_plaque', int_, 0, 0.9, mat_plaque)
    biseauter(plaque_, 0.25, 2, 40)
    m = Matrix.Translation((179.5, 36, 2)) @ Matrix.Rotation(math.radians(90), 4, 'Y')
    for o in (bague, plaque_):
        o.matrix_world = m
    bague['neon_mode'] = 'angle'
    return bague, plaque_


# ---------------------------------------------------------------------------
def construire():
    m_coque = materiau('coqueClaire', (0.03, 0.03, 0.035), 0.42, 0.35)
    m_facette = materiau('facette', (0.05, 0.05, 0.055), 0.38, 0.45)
    m_noir = materiau('anthracite', (0.012, 0.012, 0.014), 0.5, 0.3)
    m_verre = materiau('verreFume', (0.004, 0.004, 0.005), 0.05, 0.0)

    racine = vide('coque')
    clair = [plaque(m_coque)] + lunettes(m_coque)
    jupe_clair, noir = jupes(m_coque, m_noir)
    clair += jupe_clair
    fac = facettes(m_facette) + [embout(m_facette)]
    noir += inserts(m_noir)
    nerv = rainures(m_noir)
    vrs = verres(m_verre, {'coinHaut': fentes_barres(B['haut'], True), 'coinBas': fentes_barres(B['bas'], False)})

    # Filaire et arêtes du beat 11, pris sur les formes nettes (avant les biseaux).
    nets = [o for o in clair + fac + noir + vrs if not o.name.startswith('lunette')]
    s_aretes, a_aretes = aretes_vives([o for o in nets if not o.name.startswith(('insert', 'rebord', 'plaque_dessus'))], 30)
    s_fil, a_fil = aretes_vives(nets + nerv, 30)
    # cercles des lunettes : leur bord avant
    from commun import ajouter_lignes, cercle
    for x, y in V['centres']:
        for r, z in ((R_OUV, 34.9), (R_LUNETTE, 33.7)):
            s, a = cercle(r, z, 128, (x, y))
            ajouter_lignes(s_fil, a_fil, s, a)
            ajouter_lignes(s_aretes, a_aretes, s, a)

    for o in clair + noir:
        biseauter(o, 0.7, 3, 40)
    for o in fac:
        biseauter(o, 0.9, 3, 35)
    for o in nerv:
        biseauter(o, 0.22, 2, 40)
    for o in vrs:
        biseauter(o, 0.55, 2, 40)

    corps = fusionner(clair, 'coque_corps')
    facettes_ = fusionner(fac, 'coque_facettes')
    noir_ = fusionner(noir + nerv, 'coque_noir')
    verre = fusionner(vrs, 'coque_verre')
    for o in (corps, facettes_, noir_, verre):
        lisser(o, 35)
        o.parent = racine

    for o in (barres(B['haut'], True), barres(B['bas'], False)):
        o.parent = racine
    for o in ecusson(m_verre):
        o.parent = racine

    lignes('coque__filaire', s_fil, a_fil, racine)
    lignes('coque__aretes', s_aretes, a_aretes, racine)
    return racine
