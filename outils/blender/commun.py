# Outils partagés des scripts Blender de la carte.
# Unités : 1 unité Blender = 1 mm. Repère de la carte, sans conversion :
# X le long de la carte, Y vers le haut, Z vers l'avant (l'export garde ce repère).
import json
import math
import os

import bmesh
import bpy
from mathutils import Matrix

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.abspath(os.path.join(ICI, '..', '..'))

with open(os.path.join(ICI, 'dimensions.json'), encoding='utf-8') as f:
    DIM = json.load(f)


def vider():
    """Repart d'une scène vide."""
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.curves):
        for d in list(coll):
            coll.remove(d)


def materiau(nom, couleur=(0.02, 0.02, 0.02), rugosite=0.5, metal=0.0):
    """Matériau nommé. Le site le remplace par le sien au chargement (même nom que
    dans RECETTES, src/carte/materiaux.js) : ici, il sert surtout à l'aperçu."""
    m = bpy.data.materials.get(nom)
    if m:
        return m
    m = bpy.data.materials.new(nom)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*couleur, 1)
    p.inputs['Roughness'].default_value = rugosite
    p.inputs['Metallic'].default_value = metal
    return m


def lier(o, parent=None):
    bpy.context.scene.collection.objects.link(o)
    if parent is not None:
        o.parent = parent
    return o


def vide(nom, parent=None, position=(0, 0, 0)):
    o = bpy.data.objects.new(nom, None)
    o.location = position
    return lier(o, parent)


def maillage(nom, sommets, faces, mat=None, parent=None, angle=35):
    """Objet maillé à partir de listes Python. Lissé, avec arêtes vives au-delà de `angle`."""
    me = bpy.data.meshes.new(nom)
    me.from_pydata(sommets, [], faces)
    me.validate()
    o = lier(bpy.data.objects.new(nom, me), parent)
    if mat:
        me.materials.append(mat)
    lisser(o, angle)
    return o


def lignes(nom, sommets, aretes, parent=None):
    """Arêtes seules (exportées en lignes) : le filaire de construction d'une pièce."""
    me = bpy.data.meshes.new(nom)
    me.from_pydata(sommets, aretes, [])
    return lier(bpy.data.objects.new(nom, me), parent)


def lisser(o, angle=35):
    for p in o.data.polygons:
        p.use_smooth = True
    selectionner([o])
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle), keep_sharp_edges=True)


def selectionner(objets):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objets:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objets[0]


def tour(nom, profil, segments=128, mat=None, parent=None, ferme=True, angle=35):
    """Surface de révolution autour de l'axe Z. `profil` : liste de (rayon, z).
    `ferme` relie le dernier point au premier (profil d'une pièce pleine)."""
    n = len(profil)
    sommets = []
    for k in range(segments):
        a = 2 * math.pi * k / segments
        c, s = math.cos(a), math.sin(a)
        for r, z in profil:
            sommets.append((r * c, r * s, z))
    faces = []
    m = n if ferme else n - 1
    for k in range(segments):
        k2 = (k + 1) % segments
        for i in range(m):
            i2 = (i + 1) % n
            faces.append((k * n + i, k * n + i2, k2 * n + i2, k2 * n + i))
    return maillage(nom, sommets, faces, mat, parent, angle)


def cercle(rayon, z, segments=128, centre=(0, 0)):
    """Sommets et arêtes d'un cercle (pour les filaires)."""
    s = [(centre[0] + rayon * math.cos(2 * math.pi * k / segments), centre[1] + rayon * math.sin(2 * math.pi * k / segments), z) for k in range(segments)]
    a = [(k, (k + 1) % segments) for k in range(segments)]
    return s, a


def ajouter_lignes(tous_s, tous_a, s, a, ferme=False):
    """Ajoute une polyligne (ou des arêtes explicites) au paquet du filaire."""
    base = len(tous_s)
    tous_s.extend(s)
    if a is None:
        a = [(i, i + 1) for i in range(len(s) - 1)]
        if ferme:
            a.append((len(s) - 1, 0))
    tous_a.extend((i + base, j + base) for i, j in a)


def biseauter(o, largeur, segments=3, angle=40):
    """Arrondit les arêtes vives (celles qui attrapent un filet de lumière)."""
    b = o.modifiers.new('biseau', 'BEVEL')
    b.width = largeur
    b.segments = segments
    b.limit_method = 'ANGLE'
    b.angle_limit = math.radians(angle)
    b.harden_normals = False
    b.miter_outer = 'MITER_ARC'
    w = o.modifiers.new('normales', 'WEIGHTED_NORMAL')
    w.keep_sharp = True
    appliquer(o)


def appliquer(o):
    selectionner([o])
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def fusionner(objets, nom):
    selectionner(objets)
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = nom
    o.data.name = nom
    return o


def boite(nom, x0, x1, y0, y1, z0, z1, mat=None, parent=None, coupes=(1, 1, 1)):
    """Pavé défini par ses bornes, subdivisé (pour pouvoir le courber ensuite)."""
    me = bpy.data.meshes.new(nom)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bm.to_mesh(me)
    bm.free()
    o = lier(bpy.data.objects.new(nom, me), parent)
    o.data.transform(Matrix.Diagonal((x1 - x0, y1 - y0, z1 - z0, 1)))
    o.data.transform(Matrix.Translation(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)))
    if mat:
        o.data.materials.append(mat)
    if any(c > 1 for c in coupes):
        bm = bmesh.new()
        bm.from_mesh(o.data)
        for axe, c in enumerate(coupes):
            if c <= 1:
                continue
            lo = (x0, y0, z0)[axe]
            hi = (x1, y1, z1)[axe]
            for i in range(1, c):
                t = lo + (hi - lo) * i / c
                geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
                n = [0, 0, 0]
                n[axe] = 1
                co = [0, 0, 0]
                co[axe] = t
                bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=n)
        bm.to_mesh(o.data)
        bm.free()
    return o


def cuire_ao(cibles, distance=6.0, echantillons=96):
    """Occlusion ambiante cuite dans un attribut de couleur par sommet (« ao »),
    avec Cycles. Tous les objets visibles de la scène occultent."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = echantillons
    if sc.world is None:
        sc.world = bpy.data.worlds.new('monde')
    sc.world.light_settings.distance = distance
    for o in cibles:
        me = o.data
        if 'ao' in me.color_attributes:
            me.color_attributes.remove(me.color_attributes['ao'])
        attr = me.color_attributes.new('ao', 'FLOAT_COLOR', 'POINT')
        me.color_attributes.active_color = attr
        me.color_attributes.render_color_index = me.color_attributes.active_color_index
        selectionner([o])
        bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')


def exporter(nom_fichier):
    chemin = os.path.join(RACINE, 'assets', 'models', nom_fichier)
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=chemin,
        export_format='GLB',
        export_yup=False,
        export_apply=True,
        use_mesh_edges=True,
        export_vertex_color='ACTIVE',
        export_all_vertex_colors=False,
        export_active_vertex_color_when_no_material=True,
        export_extras=True,
        export_normals=True,
        export_texcoords=True,
        export_materials='EXPORT',
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=7,
        export_draco_position_quantization=16,
        export_draco_normal_quantization=12,
        export_draco_color_quantization=8,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
    )
    print('export :', chemin, round(os.path.getsize(chemin) / 1024), 'Ko')


def prisme(nom, points, z0, z1, mat=None, parent=None):
    """Contour 2D (plan XY) extrudé entre z0 et z1."""
    bm = bmesh.new()
    bas = [bm.verts.new((x, y, z0)) for x, y in points]
    face = bm.faces.new(bas)
    res = bmesh.ops.extrude_face_region(bm, geom=[face])
    haut = [e for e in res['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=haut, vec=(0, 0, z1 - z0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(nom)
    bm.to_mesh(me)
    bm.free()
    o = lier(bpy.data.objects.new(nom, me), parent)
    if mat:
        me.materials.append(mat)
    return o


def cylindre(nom, x, y, rayon, z0, z1, segments=160):
    """Outil de découpe : cylindre d'axe Z."""
    s = []
    for z in (z0, z1):
        s += [(x + rayon * math.cos(2 * math.pi * k / segments), y + rayon * math.sin(2 * math.pi * k / segments), z) for k in range(segments)]
    f = [tuple(range(segments))[::-1], tuple(range(segments, 2 * segments))]
    f += [(k, (k + 1) % segments, segments + (k + 1) % segments, segments + k) for k in range(segments)]
    me = bpy.data.meshes.new(nom)
    me.from_pydata(s, [], f)
    return lier(bpy.data.objects.new(nom, me))


def booleen(o, outils, operation='DIFFERENCE', supprimer=True):
    """Découpe (ou union, intersection) exacte, appliquée tout de suite."""
    for t in outils:
        m = o.modifiers.new('bool', 'BOOLEAN')
        m.operation = operation
        m.solver = 'EXACT'
        m.object = t
        appliquer(o)
    if supprimer:
        for t in outils:
            if t.name in bpy.data.objects:
                bpy.data.objects.remove(t, do_unlink=True)
    return o


def transformer(o, matrice):
    o.data.transform(matrice)
    o.data.update()


def pivoter_autour(o, axe, degres, centre):
    """Rotation des sommets autour d'un axe ('X', 'Y', 'Z') passant par `centre`."""
    m = Matrix.Translation(centre) @ Matrix.Rotation(math.radians(degres), 4, axe) @ Matrix.Translation([-c for c in centre])
    transformer(o, m)


def aretes_vives(objets, angle=30, ignorer_courtes=0.0):
    """Arêtes de construction : bords libres et arêtes dont l'angle entre faces
    dépasse `angle`. Renvoie (sommets, arêtes) en coordonnées monde, à prendre
    AVANT le biseau (le dessin reste celui d'un plan d'ingénieur)."""
    sommets, aretes = [], []
    seuil = math.radians(angle)
    for o in objets:
        mw = o.matrix_world
        bm = bmesh.new()
        bm.from_mesh(o.data)
        for e in bm.edges:
            lf = e.link_faces
            vive = len(lf) != 2 or e.calc_face_angle(0) > seuil
            if not vive or e.calc_length() < ignorer_courtes:
                continue
            i = len(sommets)
            sommets += [tuple(mw @ e.verts[0].co), tuple(mw @ e.verts[1].co)]
            aretes.append((i, i + 1))
        bm.free()
    return sommets, aretes


def decouper(sujet, fenetre):
    """Découpe d'un polygone 2D par un polygone convexe (Sutherland-Hodgman),
    comme `decouper` dans src/carte/outils.js."""
    sortie = list(sujet)
    n = len(fenetre)
    for i in range(n):
        ax, ay = fenetre[i]
        bx, by = fenetre[(i + 1) % n]

        def dedans(p):
            return (bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax) >= 0

        def inter(p, q):
            a1, b1 = by - ay, ax - bx
            c1 = a1 * ax + b1 * ay
            a2, b2 = q[1] - p[1], p[0] - q[0]
            c2 = a2 * p[0] + b2 * p[1]
            d = a1 * b2 - a2 * b1
            return ((b2 * c1 - b1 * c2) / d, (a1 * c2 - a2 * c1) / d)

        entree, sortie = sortie, []
        for j in range(len(entree)):
            p, q = entree[j], entree[(j + 1) % len(entree)]
            if dedans(q):
                if not dedans(p):
                    sortie.append(inter(p, q))
                sortie.append(q)
            elif dedans(p):
                sortie.append(inter(p, q))
        if not sortie:
            break
    return sortie


def arc_points(cx, cz, r, a0, a1, n):
    """Points (rayon, z) d'un arc de cercle dans le plan d'un profil, angles en degrés."""
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cz + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]
