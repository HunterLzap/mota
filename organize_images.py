# 自动资产分拣工具
import os, shutil, glob

def organize():
    root = os.path.dirname(os.path.abspath(__file__))
    images_dir = os.path.join(root, 'images')
    os.makedirs(images_dir, exist_ok=True)
    
    # 查找项目根目录、images/目录中所有包含双下划线 __ 的图片
    search_paths = [
        os.path.join(root, '*__*.*'),
        os.path.join(images_dir, '*__*.*'),
        os.path.join(images_dir, '**', '*__*.*'),
        os.path.join(root, 'downloads', '*__*.*')
    ]
    
    files = []
    for p in search_paths:
        files.extend(glob.glob(p, recursive=True))
    
    files = list(set(files)) # 去重
    moved_count = 0
    for f in files:
        filename = os.path.basename(f)
        if '__' not in filename:
            continue
        
        parts = filename.split('__')
        if parts[0] == 'images':
            parts = parts[1:]
        
        rel_target = os.path.join(*parts)
        target_path = os.path.join(images_dir, rel_target)
        
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        if os.path.abspath(f) != os.path.abspath(target_path):
            shutil.move(f, target_path)
            print(f"✓ 已自动分拣: {filename} -> {os.path.relpath(target_path, root)}")
            moved_count += 1
            
    print(f"\n分拣完成！共自动整理并就位 {moved_count} 张美术资产。")

if __name__ == '__main__':
    organize()
